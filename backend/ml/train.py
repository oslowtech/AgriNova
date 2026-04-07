"""
Land Health Prediction Model Training Pipeline
Uses NDVI data from GeoTIFF to train a Random Forest model.
"""

import os
import sys
from pathlib import Path

import joblib
import numpy as np
import rasterio
from scipy.ndimage import uniform_filter
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split

# Constants
RANDOM_SEED = 42
WINDOW_SIZE = 3
SAMPLE_SIZE = 10000
MODEL_PATH = Path(__file__).parent / "land_health_model.pkl"


def load_and_process_raster(tif_path: str) -> np.ndarray:
    """
    Load GeoTIFF and extract/compute NDVI values.
    Handles both pre-computed NDVI and multi-band imagery.
    Normalizes NDVI from (-1, 1) to (0, 1).
    """
    with rasterio.open(tif_path) as src:
        band_count = src.count
        print(f"Raster bands: {band_count}")
        
        if band_count == 1:
            # Single band - assume it's NDVI or similar index
            ndvi = src.read(1).astype(np.float32)
        elif band_count >= 4:
            # Multi-band (likely RGBN or BGRN)
            # Assume band 4 is NIR and band 1 is Red (common convention)
            red = src.read(1).astype(np.float32)
            nir = src.read(4).astype(np.float32)
            
            # Compute NDVI: (NIR - Red) / (NIR + Red)
            with np.errstate(divide='ignore', invalid='ignore'):
                ndvi = (nir - red) / (nir + red + 1e-10)
            ndvi = np.nan_to_num(ndvi, nan=0.0, posinf=0.0, neginf=0.0)
            print("Computed NDVI from NIR (band 4) and Red (band 1)")
        elif band_count == 3:
            # RGB only - use green ratio as vegetation proxy
            red = src.read(1).astype(np.float32)
            green = src.read(2).astype(np.float32)
            blue = src.read(3).astype(np.float32)
            
            # Green ratio index: (2*G - R - B) / (2*G + R + B)
            with np.errstate(divide='ignore', invalid='ignore'):
                ndvi = (2 * green - red - blue) / (2 * green + red + blue + 1e-10)
            ndvi = np.nan_to_num(ndvi, nan=0.0, posinf=0.0, neginf=0.0)
            print("Computed vegetation index from RGB bands")
        else:
            ndvi = src.read(1).astype(np.float32)
    
    # Normalize to -1, 1 range if outside bounds
    if ndvi.max() > 1 or ndvi.min() < -1:
        # Scale to -1, 1 range
        ndvi_min, ndvi_max = ndvi.min(), ndvi.max()
        if ndvi_max > ndvi_min:
            ndvi = 2 * (ndvi - ndvi_min) / (ndvi_max - ndvi_min) - 1
        else:
            ndvi = np.zeros_like(ndvi)
    
    # Remove invalid values
    ndvi = np.where(np.isnan(ndvi), 0, ndvi)
    ndvi = np.where(np.isinf(ndvi), 0, ndvi)
    
    # Normalize from (-1, 1) to (0, 1)
    ndvi_normalized = (ndvi + 1) / 2
    ndvi_normalized = np.clip(ndvi_normalized, 0, 1)
    
    return ndvi_normalized


def compute_local_statistics(ndvi: np.ndarray, window_size: int = 3) -> tuple:
    """
    Compute local mean and standard deviation using a sliding window.
    """
    ndvi_mean = uniform_filter(ndvi, size=window_size, mode='reflect')
    ndvi_sq_mean = uniform_filter(ndvi ** 2, size=window_size, mode='reflect')
    ndvi_std = np.sqrt(np.maximum(ndvi_sq_mean - ndvi_mean ** 2, 0))
    
    return ndvi_mean, ndvi_std


def simulate_environmental_features(n_samples: int, seed: int = RANDOM_SEED) -> dict:
    """
    Simulate realistic environmental features.
    """
    np.random.seed(seed)
    
    return {
        'rainfall': np.random.uniform(200, 2000, n_samples),  # mm/year
        'soil_pH': np.random.uniform(5.0, 8.0, n_samples),
        'temperature': np.random.uniform(10, 40, n_samples),  # Celsius
    }


def generate_health_labels(ndvi_values: np.ndarray, seed: int = RANDOM_SEED) -> np.ndarray:
    """
    Generate pseudo-labels (health scores 0-100) based on NDVI thresholds.
    """
    np.random.seed(seed)
    n = len(ndvi_values)
    labels = np.zeros(n)
    
    # NDVI > 0.6 (normalized: > 0.8) -> 80-100
    mask_high = ndvi_values > 0.8
    labels[mask_high] = np.random.uniform(80, 100, mask_high.sum())
    
    # NDVI 0.4-0.6 (normalized: 0.7-0.8) -> 60-80
    mask_moderate = (ndvi_values > 0.7) & (ndvi_values <= 0.8)
    labels[mask_moderate] = np.random.uniform(60, 80, mask_moderate.sum())
    
    # NDVI 0.2-0.4 (normalized: 0.6-0.7) -> 30-60
    mask_low = (ndvi_values > 0.6) & (ndvi_values <= 0.7)
    labels[mask_low] = np.random.uniform(30, 60, mask_low.sum())
    
    # NDVI < 0.2 (normalized: < 0.6) -> 0-30
    mask_poor = ndvi_values <= 0.6
    labels[mask_poor] = np.random.uniform(0, 30, mask_poor.sum())
    
    return labels


def extract_features(tif_path: str, sample_size: int = SAMPLE_SIZE) -> tuple:
    """
    Extract features and generate labels from GeoTIFF.
    Returns X (features) and y (labels).
    """
    print(f"Loading raster from: {tif_path}")
    ndvi = load_and_process_raster(tif_path)
    
    print(f"Raster shape: {ndvi.shape}")
    print(f"NDVI range: [{ndvi.min():.3f}, {ndvi.max():.3f}]")
    
    # Compute local statistics
    print("Computing local statistics...")
    ndvi_mean, ndvi_std = compute_local_statistics(ndvi, WINDOW_SIZE)
    
    # Flatten arrays
    ndvi_flat = ndvi.flatten()
    ndvi_mean_flat = ndvi_mean.flatten()
    ndvi_std_flat = ndvi_std.flatten()
    
    # Filter out zero/invalid pixels
    valid_mask = ndvi_flat > 0.01
    ndvi_flat = ndvi_flat[valid_mask]
    ndvi_mean_flat = ndvi_mean_flat[valid_mask]
    ndvi_std_flat = ndvi_std_flat[valid_mask]
    
    print(f"Valid pixels: {len(ndvi_flat)}")
    
    # Sample if dataset is too large
    if len(ndvi_flat) > sample_size:
        np.random.seed(RANDOM_SEED)
        indices = np.random.choice(len(ndvi_flat), sample_size, replace=False)
        ndvi_flat = ndvi_flat[indices]
        ndvi_mean_flat = ndvi_mean_flat[indices]
        ndvi_std_flat = ndvi_std_flat[indices]
    
    n_samples = len(ndvi_flat)
    print(f"Using {n_samples} samples for training")
    
    # Simulate environmental features
    env_features = simulate_environmental_features(n_samples)
    
    # Create feature matrix
    X = np.column_stack([
        ndvi_flat,
        ndvi_mean_flat,
        ndvi_std_flat,
        env_features['rainfall'],
        env_features['soil_pH'],
        env_features['temperature'],
    ])
    
    # Generate labels
    y = generate_health_labels(ndvi_flat)
    
    return X, y


def train_model(X: np.ndarray, y: np.ndarray) -> RandomForestRegressor:
    """
    Train Random Forest model and evaluate performance.
    """
    # Split dataset
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_SEED
    )
    
    print(f"\nTraining set size: {len(X_train)}")
    print(f"Test set size: {len(X_test)}")
    
    # Train model
    print("\nTraining Random Forest model...")
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=RANDOM_SEED,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    r2 = r2_score(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)
    
    print("\n" + "=" * 50)
    print("MODEL PERFORMANCE")
    print("=" * 50)
    print(f"R² Score: {r2:.4f}")
    print(f"MAE: {mae:.4f}")
    
    # Feature importance
    feature_names = ['ndvi', 'ndvi_mean', 'ndvi_std', 'rainfall', 'soil_pH', 'temperature']
    importances = model.feature_importances_
    
    print("\n" + "=" * 50)
    print("FEATURE IMPORTANCE")
    print("=" * 50)
    for name, importance in sorted(zip(feature_names, importances), key=lambda x: -x[1]):
        print(f"{name:15} : {importance:.4f}")
    
    return model


def save_model(model: RandomForestRegressor, path: Path = MODEL_PATH) -> None:
    """Save trained model to disk."""
    joblib.dump(model, path)
    print(f"\nModel saved to: {path}")


def load_model(path: Path = MODEL_PATH) -> RandomForestRegressor:
    """Load trained model from disk."""
    return joblib.load(path)


def predict_health(features: dict, model: RandomForestRegressor = None) -> float:
    """
    Predict land health score from features.
    
    Args:
        features: dict with keys: ndvi, ndvi_mean, ndvi_std, rainfall, soil_pH, temperature
        model: trained model (loads from disk if None)
    
    Returns:
        Predicted health score (0-100)
    """
    if model is None:
        model = load_model()
    
    X = np.array([[
        features['ndvi'],
        features.get('ndvi_mean', features['ndvi']),
        features.get('ndvi_std', 0.05),
        features['rainfall'],
        features['soil_pH'],
        features['temperature'],
    ]])
    
    prediction = model.predict(X)[0]
    return float(np.clip(prediction, 0, 100))


def main():
    """Main training pipeline."""
    # Find TIF file - path: backend/ml -> backend -> GeoInsight -> ProblemStatementAndData
    data_dir = Path(__file__).resolve().parent.parent.parent / "ProblemStatementAndData"
    
    print(f"Looking for TIF files in: {data_dir}")
    
    # Available TIF files:
    # - Orthomosaic.tif (RGB/multispectral imagery - use for NDVI)
    # - Digital Elevation model.tif (DEM - elevation data)
    
    # Prefer Orthomosaic for vegetation analysis
    orthomosaic = data_dir / "Orthomosaic.tif"
    dem_file = data_dir / "Digital Elevation model.tif"
    
    tif_path = None
    if orthomosaic.exists():
        tif_path = str(orthomosaic)
        print(f"Using Orthomosaic: {tif_path}")
    elif dem_file.exists():
        tif_path = str(dem_file)
        print(f"Using DEM (fallback): {tif_path}")
    
    if tif_path is None:
        # Create synthetic data for demo
        print("No TIF file found. Creating synthetic NDVI data for demo...")
        np.random.seed(RANDOM_SEED)
        n_samples = SAMPLE_SIZE
        
        # Simulate NDVI (normalized 0-1)
        ndvi = np.random.beta(2, 2, n_samples)  # Beta distribution for realistic NDVI
        ndvi_mean = ndvi + np.random.normal(0, 0.05, n_samples)
        ndvi_mean = np.clip(ndvi_mean, 0, 1)
        ndvi_std = np.abs(np.random.normal(0.05, 0.02, n_samples))
        
        env_features = simulate_environmental_features(n_samples)
        
        X = np.column_stack([
            ndvi,
            ndvi_mean,
            ndvi_std,
            env_features['rainfall'],
            env_features['soil_pH'],
            env_features['temperature'],
        ])
        
        y = generate_health_labels(ndvi)
    else:
        X, y = extract_features(tif_path)
    
    # Train model
    model = train_model(X, y)
    
    # Save model
    save_model(model)
    
    # Test inference
    print("\n" + "=" * 50)
    print("INFERENCE TEST")
    print("=" * 50)
    
    test_features = {
        'ndvi': 0.75,
        'ndvi_mean': 0.72,
        'ndvi_std': 0.08,
        'rainfall': 800,
        'soil_pH': 6.5,
        'temperature': 25,
    }
    
    prediction = predict_health(test_features, model)
    print(f"Test features: {test_features}")
    print(f"Predicted health score: {prediction:.2f}")
    
    print("\n✅ Training complete!")


if __name__ == "__main__":
    main()
