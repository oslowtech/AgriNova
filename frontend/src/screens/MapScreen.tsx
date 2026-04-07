import React, { useEffect, useMemo, useState, useRef } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker, Polygon, Polyline, Circle, MapPressEvent } from "react-native-maps";
import * as SecureStore from "expo-secure-store";
import { fetchBoundary, fetchZoneMap, fetchLandHealth, fetchValuation } from "../api/client";
import { palette, radius, shadows, spacing, typography } from "../theme";
import { ZoneMap, LandHealth, Valuation } from "../types";

type LatLng = { latitude: number; longitude: number };

const DEMO_CENTER = { latitude: 12.9716, longitude: 77.5946 };
const BOUNDARY_STORAGE_KEY = "user_boundary";

function normalizeToLatLng(coords: number[][]): LatLng[] {
  const xs = coords.map((c) => c[0]);
  const ys = coords.map((c) => c[1]);

  const allLikelyLatLng = xs.every((x) => Math.abs(x) <= 180) && ys.every((y) => Math.abs(y) <= 90);
  if (allLikelyLatLng) {
    return coords.map(([x, y]) => ({ latitude: y, longitude: x }));
  }

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);

  return coords.map(([x, y]) => ({
    latitude: DEMO_CENTER.latitude + ((y - minY) / spanY - 0.5) * 0.06,
    longitude: DEMO_CENTER.longitude + ((x - minX) / spanX - 0.5) * 0.06
  }));
}

function extractBoundaryPolygon(geojson: any): LatLng[] {
  const features = geojson?.features ?? [];
  const first = features[0];
  const geom = first?.geometry;

  if (!geom) return [];

  if (geom.type === "Polygon") {
    const ring = geom.coordinates?.[0] ?? [];
    return normalizeToLatLng(ring);
  }

  if (geom.type === "LineString") {
    return normalizeToLatLng(geom.coordinates ?? []);
  }

  return [];
}

function zoneColor(zone: string) {
  if (zone === "dense") return palette.dense;
  if (zone === "healthy") return palette.healthy;
  if (zone === "sparse") return palette.sparse;
  return palette.stressed;
}

function calculateCenter(points: LatLng[]): LatLng {
  if (points.length === 0) return DEMO_CENTER;
  const lat = points.reduce((sum, p) => sum + p.latitude, 0) / points.length;
  const lng = points.reduce((sum, p) => sum + p.longitude, 0) / points.length;
  return { latitude: lat, longitude: lng };
}

export function MapScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [boundary, setBoundary] = useState<LatLng[]>([]);
  const [userBoundary, setUserBoundary] = useState<LatLng[]>([]);
  const [zoneMap, setZoneMap] = useState<ZoneMap | null>(null);
  const [landHealth, setLandHealth] = useState<LandHealth | null>(null);
  const [valuation, setValuation] = useState<Valuation | null>(null);
  const [showBoundary, setShowBoundary] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<LatLng[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPrediction, setShowPrediction] = useState(false);

  // Measurement tool states
  const [measurementMode, setMeasurementMode] = useState<'point' | 'line' | 'area' | null>(null);
  const [measurementPoints, setMeasurementPoints] = useState<LatLng[]>([]);
  const [measurements, setMeasurements] = useState<Array<{
    id: string;
    type: 'point' | 'line' | 'area';
    points: LatLng[];
    value: string;
    color: string;
  }>>([]);

  // Load saved boundary on mount
  useEffect(() => {
    async function loadSavedBoundary() {
      try {
        const saved = await SecureStore.getItemAsync(BOUNDARY_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setUserBoundary(parsed);
        }
      } catch (e) {
        console.warn("Could not load saved boundary");
      }
    }
    loadSavedBoundary();
  }, []);

  useEffect(() => {
    async function load() {
      const activeBoundary = userBoundary.length > 0 ? userBoundary : null;
      const center = activeBoundary ? calculateCenter(activeBoundary) : DEMO_CENTER;
      
      const [boundaryData, zoneData, healthData, valuationData] = await Promise.all([
        fetchBoundary(),
        fetchZoneMap(center.latitude, center.longitude),
        fetchLandHealth(center.latitude, center.longitude),
        fetchValuation(center.latitude, center.longitude)
      ]);
      
      if (userBoundary.length === 0) {
        setBoundary(extractBoundaryPolygon(boundaryData));
      }
      setZoneMap(zoneData);
      setLandHealth(healthData);
      setValuation(valuationData);
      setLoading(false);
    }

    void load();
  }, [userBoundary]);

  const activeBoundary = userBoundary.length > 0 ? userBoundary : boundary;

  const zonePolygons = useMemo(() => {
    if (!zoneMap || activeBoundary.length === 0) return [];

    const minLat = Math.min(...activeBoundary.map((p) => p.latitude));
    const maxLat = Math.max(...activeBoundary.map((p) => p.latitude));
    const minLng = Math.min(...activeBoundary.map((p) => p.longitude));
    const maxLng = Math.max(...activeBoundary.map((p) => p.longitude));

    const latSpan = maxLat - minLat;
    const lngSpan = maxLng - minLng;

    return zoneMap.cells.map((cell) => {
      const size = zoneMap.grid_size;
      const y0 = minLat + (cell.row / size) * latSpan;
      const y1 = minLat + ((cell.row + 1) / size) * latSpan;
      const x0 = minLng + (cell.col / size) * lngSpan;
      const x1 = minLng + ((cell.col + 1) / size) * lngSpan;
      return {
        zone: cell.zone,
        coordinates: [
          { latitude: y0, longitude: x0 },
          { latitude: y1, longitude: x0 },
          { latitude: y1, longitude: x1 },
          { latitude: y0, longitude: x1 }
        ]
      };
    });
  }, [zoneMap, activeBoundary]);

  const handleMapPress = (event: MapPressEvent) => {
    if (isDrawing) {
      const { coordinate } = event.nativeEvent;
      setDrawingPoints(prev => [...prev, coordinate]);
    } else if (measurementMode) {
      handleMeasurementPress(event);
    }
  };

  const startDrawing = () => {
    setIsDrawing(true);
    setDrawingPoints([]);
    Alert.alert(
      "Draw Boundary",
      "Tap on the map to add points. Tap 'Save Boundary' when done (minimum 3 points).",
      [{ text: "OK" }]
    );
  };

  const cancelDrawing = () => {
    setIsDrawing(false);
    setDrawingPoints([]);
  };

  const saveBoundary = async () => {
    if (drawingPoints.length < 3) {
      Alert.alert("Error", "Please add at least 3 points to create a boundary.");
      return;
    }

    // Close the polygon
    const closedBoundary = [...drawingPoints, drawingPoints[0]];
    
    try {
      await SecureStore.setItemAsync(BOUNDARY_STORAGE_KEY, JSON.stringify(closedBoundary));
      setUserBoundary(closedBoundary);
      setIsDrawing(false);
      setDrawingPoints([]);
      setLoading(true); // Trigger reload with new boundary
      
      Alert.alert("Success", "Boundary saved! Loading predictions for your land...");
    } catch (e) {
      Alert.alert("Error", "Could not save boundary. Please try again.");
    }
  };

  const clearBoundary = async () => {
    Alert.alert(
      "Clear Boundary",
      "Are you sure you want to clear your saved boundary?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            await SecureStore.deleteItemAsync(BOUNDARY_STORAGE_KEY);
            setUserBoundary([]);
            setLoading(true);
          }
        }
      ]
    );
  };

  const undoLastPoint = () => {
    setDrawingPoints(prev => prev.slice(0, -1));
  };

  // Measurement tool functions
  const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const calculatePolygonArea = (points: LatLng[]): number => {
    if (points.length < 3) return 0;
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].longitude * points[j].latitude;
      area -= points[j].longitude * points[i].latitude;
    }
    return Math.abs(area) / 2 * 111319.9 * 111319.9 * Math.cos(points[0].latitude * Math.PI / 180);
  };

  const handleMeasurementPress = (event: MapPressEvent) => {
    if (!measurementMode) return;
    
    const { coordinate } = event.nativeEvent;
    
    if (measurementMode === 'point') {
      // Add single point measurement
      const newMeasurement = {
        id: Date.now().toString(),
        type: 'point' as const,
        points: [coordinate],
        value: `${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`,
        color: '#FF6B6B'
      };
      setMeasurements(prev => [...prev, newMeasurement]);
      setMeasurementMode(null);
    } else {
      // For line and area, collect multiple points
      setMeasurementPoints(prev => {
        const newPoints = [...prev, coordinate];
        
        if (measurementMode === 'line' && newPoints.length === 2) {
          // Complete line measurement
          const distance = haversineDistance(
            newPoints[0].latitude, newPoints[0].longitude,
            newPoints[1].latitude, newPoints[1].longitude
          );
          const newMeasurement = {
            id: Date.now().toString(),
            type: 'line' as const,
            points: newPoints,
            value: `${distance.toFixed(1)} m`,
            color: '#4ECDC4'
          };
          setMeasurements(prev => [...prev, newMeasurement]);
          setMeasurementPoints([]);
          setMeasurementMode(null);
        } else if (measurementMode === 'area' && newPoints.length >= 3) {
          // Allow continuing to add points for area
          return newPoints;
        }
        
        return newPoints;
      });
    }
  };

  const finishAreaMeasurement = () => {
    if (measurementMode === 'area' && measurementPoints.length >= 3) {
      const area = calculatePolygonArea(measurementPoints);
      const newMeasurement = {
        id: Date.now().toString(),
        type: 'area' as const,
        points: [...measurementPoints],
        value: area > 10000 ? `${(area / 10000).toFixed(2)} ha` : `${area.toFixed(0)} m²`,
        color: '#45B7D1'
      };
      setMeasurements(prev => [...prev, newMeasurement]);
      setMeasurementPoints([]);
      setMeasurementMode(null);
    }
  };

  const clearAllMeasurements = () => {
    setMeasurements([]);
    setMeasurementPoints([]);
    setMeasurementMode(null);
  };

  const startMeasurement = (mode: 'point' | 'line' | 'area') => {
    setMeasurementMode(mode);
    setMeasurementPoints([]);
    const instructions = {
      point: "Tap anywhere to get coordinates",
      line: "Tap two points to measure distance",
      area: "Tap multiple points to create area (min 3 points)"
    };
    Alert.alert("Measurement Tool", instructions[mode], [{ text: "OK" }]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={styles.loadingText}>Loading map data...</Text>
      </View>
    );
  }

  const mapCenter = activeBoundary.length > 0 ? calculateCenter(activeBoundary) : DEMO_CENTER;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        mapType="satellite"
        initialRegion={{
          latitude: mapCenter.latitude,
          longitude: mapCenter.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02
        }}
        onPress={handleMapPress}
      >
        {/* NDVI Zone polygons */}
        {showZones && !isDrawing && zonePolygons.map((p, idx) => (
          <Polygon
            key={`zone-${idx}`}
            coordinates={p.coordinates}
            fillColor={`${zoneColor(p.zone)}66`}
            strokeColor={`${zoneColor(p.zone)}AA`}
            strokeWidth={0.5}
          />
        ))}

        {/* User boundary or default boundary */}
        {showBoundary && !isDrawing && activeBoundary.length > 2 && (
          <Polygon
            coordinates={activeBoundary}
            fillColor={userBoundary.length > 0 ? palette.primary + "22" : palette.accent + "22"}
            strokeColor={userBoundary.length > 0 ? palette.primary : palette.accent}
            strokeWidth={3}
          />
        )}

        {/* Drawing points */}
        {isDrawing && drawingPoints.map((point, idx) => (
          <Marker
            key={`draw-point-${idx}`}
            coordinate={point}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.drawPoint}>
              <Text style={styles.drawPointText}>{idx + 1}</Text>
            </View>
          </Marker>
        ))}

        {/* Drawing polygon preview */}
        {isDrawing && drawingPoints.length >= 2 && (
          <Polygon
            coordinates={drawingPoints}
            fillColor={palette.info + "33"}
            strokeColor={palette.info}
            strokeWidth={2}
          />
        )}

        {/* Measurement points and lines */}
        {measurementPoints.map((point, idx) => (
          <Marker
            key={`measure-point-${idx}`}
            coordinate={point}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={[styles.measurePoint, { backgroundColor: measurementMode === 'point' ? '#FF6B6B' : measurementMode === 'line' ? '#4ECDC4' : '#45B7D1' }]}>
              <Text style={styles.measurePointText}>{idx + 1}</Text>
            </View>
          </Marker>
        ))}

        {/* Measurement area preview */}
        {measurementMode === 'area' && measurementPoints.length >= 2 && (
          <Polygon
            coordinates={measurementPoints}
            fillColor="#45B7D144"
            strokeColor="#45B7D1"
            strokeWidth={2}
          />
        )}

        {/* Measurement line preview */}
        {measurementMode === 'line' && measurementPoints.length === 1 && (
          <Circle
            center={measurementPoints[0]}
            radius={5}
            fillColor="#4ECDC444"
            strokeColor="#4ECDC4"
            strokeWidth={2}
          />
        )}

        {/* Completed measurements */}
        {measurements.map((measurement) => (
          <React.Fragment key={measurement.id}>
            {measurement.type === 'point' && (
              <Marker coordinate={measurement.points[0]}>
                <View style={[styles.completedMeasurement, { backgroundColor: measurement.color }]}>
                  <Text style={styles.completedMeasurementText}>📍</Text>
                </View>
              </Marker>
            )}
            
            {measurement.type === 'line' && (
              <>
                <Polyline
                  coordinates={measurement.points}
                  strokeColor={measurement.color}
                  strokeWidth={3}
                />
                {measurement.points.map((point, idx) => (
                  <Marker key={`line-marker-${measurement.id}-${idx}`} coordinate={point}>
                    <View style={[styles.completedMeasurement, { backgroundColor: measurement.color }]}>
                      <Text style={styles.completedMeasurementText}>{idx + 1}</Text>
                    </View>
                  </Marker>
                ))}
              </>
            )}
            
            {measurement.type === 'area' && (
              <>
                <Polygon
                  coordinates={measurement.points}
                  fillColor={measurement.color + "44"}
                  strokeColor={measurement.color}
                  strokeWidth={2}
                />
                {measurement.points.map((point, idx) => (
                  <Marker key={`area-marker-${measurement.id}-${idx}`} coordinate={point}>
                    <View style={[styles.completedMeasurement, { backgroundColor: measurement.color }]}>
                      <Text style={styles.completedMeasurementText}>{idx + 1}</Text>
                    </View>
                  </Marker>
                ))}
              </>
            )}
          </React.Fragment>
        ))}
      </MapView>

      {/* Top card */}
      <View style={[styles.topCard, { top: insets.top + spacing.md }]}>
        <Text style={styles.topIcon}>🗺️</Text>
        <View style={styles.topContent}>
          <Text style={styles.topTitle}>
            {userBoundary.length > 0 ? "Your Land Boundary" : "Field Intelligence Map"}
          </Text>
          <Text style={styles.topSubtitle}>
            {isDrawing ? `${drawingPoints.length} points selected` : "Tap Draw to set your boundary"}
          </Text>
        </View>
      </View>

      {/* Prediction Panel */}
      {showPrediction && landHealth && valuation && !isDrawing && (
        <View style={[styles.predictionPanel, { top: insets.top + 90 }]}>
          <Text style={styles.predictionTitle}>🎯 Land Predictions</Text>
          <View style={styles.predictionRow}>
            <View style={styles.predictionItem}>
              <Text style={styles.predictionValue}>{landHealth.score.toFixed(0)}</Text>
              <Text style={styles.predictionLabel}>Health Score</Text>
            </View>
            <View style={styles.predictionDivider} />
            <View style={styles.predictionItem}>
              <Text style={styles.predictionValue}>{landHealth.label}</Text>
              <Text style={styles.predictionLabel}>Status</Text>
            </View>
            <View style={styles.predictionDivider} />
            <View style={styles.predictionItem}>
              <Text style={styles.predictionValue}>₹{(valuation.mid / 100000).toFixed(1)}L</Text>
              <Text style={styles.predictionLabel}>Est. Value</Text>
            </View>
          </View>
          
          {/* Top Value Factors */}
          {valuation.top_factors && valuation.top_factors.length > 0 && (
            <View style={styles.topFactors}>
              <Text style={styles.topFactorsTitle}>💡 Top Value Drivers</Text>
              {valuation.top_factors.slice(0, 3).map((factor, idx) => (
                <View key={idx} style={styles.factorRow}>
                  <Text style={styles.factorName}>{factor.name}</Text>
                  <Text style={styles.factorValue}>{factor.contribution}%</Text>
                </View>
              ))}
            </View>
          )}
          
          <View style={styles.predictionMetrics}>
            <Text style={styles.metricText}>NDVI: {landHealth.ndvi.toFixed(2)}</Text>
            <Text style={styles.metricText}>Rainfall: {landHealth.rainfall}mm</Text>
            <Text style={styles.metricText}>Soil: {landHealth.soil}%</Text>
          </View>
        </View>
      )}

      {/* Drawing controls */}
      {isDrawing && (
        <View style={[styles.drawingControls, { top: insets.top + 90 }]}>
          <Pressable style={styles.drawBtn} onPress={undoLastPoint} disabled={drawingPoints.length === 0}>
            <Text style={styles.drawBtnText}>↩️ Undo</Text>
          </Pressable>
          <Pressable style={[styles.drawBtn, styles.drawBtnPrimary]} onPress={saveBoundary}>
            <Text style={[styles.drawBtnText, styles.drawBtnTextPrimary]}>✓ Save ({drawingPoints.length})</Text>
          </Pressable>
          <Pressable style={[styles.drawBtn, styles.drawBtnDanger]} onPress={cancelDrawing}>
            <Text style={[styles.drawBtnText, styles.drawBtnTextDanger]}>✕ Cancel</Text>
          </Pressable>
        </View>
      )}

      {/* Legend */}
      {!isDrawing && (
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>NDVI Zones</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: palette.dense }]} />
              <Text style={styles.legendLabel}>Dense</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: palette.healthy }]} />
              <Text style={styles.legendLabel}>Healthy</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: palette.sparse }]} />
              <Text style={styles.legendLabel}>Sparse</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: palette.stressed }]} />
              <Text style={styles.legendLabel}>Stressed</Text>
            </View>
          </View>
        </View>
      )}

      {/* Measurement controls */}
      {measurementMode && (
        <View style={[styles.measurementControls, { top: insets.top + 90 }]}>
          {measurementMode === 'area' && measurementPoints.length >= 3 && (
            <Pressable style={[styles.drawBtn, styles.drawBtnPrimary]} onPress={finishAreaMeasurement}>
              <Text style={[styles.drawBtnText, styles.drawBtnTextPrimary]}>✓ Finish Area</Text>
            </Pressable>
          )}
          <Pressable style={[styles.drawBtn, styles.drawBtnDanger]} onPress={() => setMeasurementMode(null)}>
            <Text style={[styles.drawBtnText, styles.drawBtnTextDanger]}>✕ Cancel</Text>
          </Pressable>
        </View>
      )}

      {/* Measurement results */}
      {measurements.length > 0 && !isDrawing && !measurementMode && (
        <View style={[styles.measurementResults, { bottom: 180 + insets.bottom }]}>
          <View style={styles.measurementHeader}>
            <Text style={styles.measurementTitle}>📐 Measurements</Text>
            <Pressable onPress={clearAllMeasurements}>
              <Text style={styles.clearMeasurementsText}>Clear All</Text>
            </Pressable>
          </View>
          {measurements.slice(-3).map((measurement) => (
            <View key={measurement.id} style={styles.measurementResult}>
              <View style={[styles.measurementDot, { backgroundColor: measurement.color }]} />
              <Text style={styles.measurementText}>
                {measurement.type === 'point' ? '📍' : measurement.type === 'line' ? '📏' : '🗺️'} {measurement.value}
              </Text>
            </View>
          ))}
          {measurements.length > 3 && (
            <Text style={styles.measurementMore}>+{measurements.length - 3} more</Text>
          )}
        </View>
      )}

      {/* Bottom controls */}
      <View style={[styles.controls, { bottom: 100 + insets.bottom }]}>
        {!isDrawing && !measurementMode ? (
          <>
            <Pressable 
              style={[styles.controlBtn, showPrediction && styles.controlBtnActive]} 
              onPress={() => setShowPrediction((v) => !v)}
            >
              <Text style={styles.controlIcon}>🎯</Text>
              <Text style={[styles.controlText, showPrediction && styles.controlTextActive]}>
                Predict
              </Text>
            </Pressable>
            <Pressable 
              style={styles.controlBtn} 
              onPress={startDrawing}
            >
              <Text style={styles.controlIcon}>✏️</Text>
              <Text style={styles.controlText}>Draw</Text>
            </Pressable>
            <Pressable 
              style={styles.controlBtn} 
              onPress={() => startMeasurement('point')}
            >
              <Text style={styles.controlIcon}>📍</Text>
              <Text style={styles.controlText}>Point</Text>
            </Pressable>
            <Pressable 
              style={styles.controlBtn} 
              onPress={() => startMeasurement('line')}
            >
              <Text style={styles.controlIcon}>📏</Text>
              <Text style={styles.controlText}>Distance</Text>
            </Pressable>
            <Pressable 
              style={styles.controlBtn} 
              onPress={() => startMeasurement('area')}
            >
              <Text style={styles.controlIcon}>🗺️</Text>
              <Text style={styles.controlText}>Area</Text>
            </Pressable>
            {userBoundary.length > 0 && (
              <Pressable 
                style={styles.controlBtn} 
                onPress={clearBoundary}
              >
                <Text style={styles.controlIcon}>🗑️</Text>
                <Text style={styles.controlText}>Clear</Text>
              </Pressable>
            )}
          </>
        ) : measurementMode ? (
          <View style={styles.drawingHint}>
            <Text style={styles.drawingHintText}>
              {measurementMode === 'point' ? '📍 Tap to get coordinates' : 
               measurementMode === 'line' ? '📏 Tap two points to measure distance' :
               '🗺️ Tap points to create area (min 3)'}
            </Text>
          </View>
        ) : (
          <View style={styles.drawingHint}>
            <Text style={styles.drawingHintText}>
              👆 Tap on the map to add boundary points
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.bg,
    gap: spacing.md
  },
  loadingText: {
    ...typography.caption,
    color: palette.muted
  },
  topCard: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.cardBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.lg
  },
  topIcon: {
    fontSize: 28
  },
  topContent: {
    flex: 1
  },
  topTitle: {
    ...typography.bodyBold,
    color: palette.ink
  },
  topSubtitle: {
    ...typography.small,
    color: palette.muted,
    marginTop: 2
  },
  legend: {
    position: "absolute",
    top: 120,
    right: spacing.md,
    backgroundColor: palette.cardBg,
    borderRadius: radius.md,
    padding: spacing.sm,
    ...shadows.md
  },
  legendTitle: {
    ...typography.small,
    color: palette.muted,
    marginBottom: spacing.xs,
    textAlign: "center"
  },
  legendItems: {
    gap: 6
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6
  },
  legendLabel: {
    ...typography.small,
    color: palette.ink
  },
  controls: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    flexDirection: "row",
    gap: spacing.sm
  },
  controlBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: 14,
    borderRadius: radius.lg,
    backgroundColor: palette.cardBg,
    ...shadows.md
  },
  controlBtnActive: {
    backgroundColor: palette.primary,
  },
  controlIcon: {
    fontSize: 18
  },
  controlText: {
    ...typography.bodyBold,
    color: palette.ink
  },
  controlTextActive: {
    color: palette.surface
  },
  // Drawing styles
  drawPoint: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.info,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: palette.surface
  },
  drawPointText: {
    color: palette.surface,
    fontWeight: "bold",
    fontSize: 12
  },
  drawingControls: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    flexDirection: "row",
    gap: spacing.sm
  },
  drawBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    backgroundColor: palette.cardBg,
    alignItems: "center",
    ...shadows.md
  },
  drawBtnPrimary: {
    backgroundColor: palette.primary
  },
  drawBtnDanger: {
    backgroundColor: palette.cardBg,
    borderWidth: 1,
    borderColor: palette.error
  },
  drawBtnText: {
    ...typography.bodyBold,
    color: palette.ink
  },
  drawBtnTextPrimary: {
    color: palette.surface
  },
  drawBtnTextDanger: {
    color: palette.error
  },
  drawingHint: {
    flex: 1,
    backgroundColor: palette.info,
    padding: spacing.md,
    borderRadius: radius.lg,
    alignItems: "center"
  },
  drawingHintText: {
    ...typography.bodyBold,
    color: palette.surface
  },
  // Prediction panel styles
  predictionPanel: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    backgroundColor: palette.cardBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.lg
  },
  predictionTitle: {
    ...typography.bodyBold,
    color: palette.ink,
    marginBottom: spacing.sm,
    textAlign: "center"
  },
  predictionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around"
  },
  predictionItem: {
    alignItems: "center"
  },
  predictionValue: {
    ...typography.h2,
    color: palette.primary
  },
  predictionLabel: {
    ...typography.small,
    color: palette.muted
  },
  predictionDivider: {
    width: 1,
    height: 40,
    backgroundColor: palette.border
  },
  predictionMetrics: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: palette.border
  },
  metricText: {
    ...typography.small,
    color: palette.muted
  },
  topFactors: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: palette.border
  },
  topFactorsTitle: {
    ...typography.small,
    color: palette.ink,
    fontWeight: "bold",
    marginBottom: spacing.xs,
    textAlign: "center"
  },
  factorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2
  },
  factorName: {
    ...typography.small,
    color: palette.muted,
    flex: 1
  },
  factorValue: {
    ...typography.small,
    color: palette.primary,
    fontWeight: "bold"
  },
  measurePoint: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff"
  },
  measurePointText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold"
  },
  completedMeasurement: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fff"
  },
  completedMeasurementText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "bold"
  },
  measurementControls: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center"
  },
  measurementResults: {
    position: "absolute",
    right: spacing.md,
    backgroundColor: palette.cardBg,
    borderRadius: radius.md,
    padding: spacing.sm,
    ...shadows.md,
    maxWidth: 200
  },
  measurementHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs
  },
  measurementTitle: {
    ...typography.small,
    color: palette.ink,
    fontWeight: "bold"
  },
  clearMeasurementsText: {
    ...typography.small,
    color: palette.danger,
    fontSize: 10
  },
  measurementResult: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: 4
  },
  measurementDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  measurementText: {
    ...typography.small,
    color: palette.muted,
    flex: 1
  },
  measurementMore: {
    ...typography.small,
    color: palette.muted,
    fontSize: 10,
    textAlign: "center",
    marginTop: 4
  }
});
