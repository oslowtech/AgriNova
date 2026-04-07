"""
External API integrations for land intelligence data.
All APIs are FREE and require no API keys.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional
import httpx

# Timeout for external API calls
TIMEOUT = 15.0


@dataclass
class SoilData:
    """Soil properties from ISRIC SoilGrids."""
    ph: float  # pH value (0-14)
    organic_carbon: float  # g/kg
    clay: float  # %
    sand: float  # %
    silt: float  # %
    texture_class: str  # e.g., "Clay Loam", "Sandy"
    confidence: float  # 0-1


@dataclass
class WeatherData:
    """Historical weather data from Open-Meteo."""
    temperature_mean: float  # °C
    temperature_min: float  # °C
    temperature_max: float  # °C
    precipitation_sum: float  # mm
    precipitation_days: int  # days with >1mm rain
    heat_stress_days: int  # days >35°C
    monthly_temps: list[float]  # 12 months
    monthly_precip: list[float]  # 12 months
    rainfall_deviation: str  # "surplus", "normal", "deficit"


@dataclass
class ProximityData:
    """Proximity to features from OSM Overpass."""
    nearest_highway_km: float
    nearest_town_km: float
    nearest_water_km: float
    highway_name: Optional[str]
    town_name: Optional[str]
    water_name: Optional[str]


@dataclass
class LocationInfo:
    """Reverse geocoding from OSM Nominatim."""
    display_name: str
    village: Optional[str]
    town: Optional[str]
    city: Optional[str]
    district: Optional[str]
    state: Optional[str]
    country: str


async def fetch_soil_data(lat: float, lng: float) -> Optional[SoilData]:
    """
    Fetch soil properties from ISRIC SoilGrids REST API.
    FREE - No API key required.
    
    API Docs: https://rest.isric.org/soilgrids/v2.0/docs
    """
    url = "https://rest.isric.org/soilgrids/v2.0/properties/query"
    params = {
        "lon": lng,
        "lat": lat,
        "property": ["phh2o", "soc", "clay", "sand", "silt"],
        "depth": "0-5cm",
        "value": "mean"
    }
    
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            properties = data.get("properties", {}).get("layers", [])
            
            # Extract values
            values = {}
            for layer in properties:
                name = layer.get("name")
                mean_value = layer.get("depths", [{}])[0].get("values", {}).get("mean")
                if mean_value is not None:
                    values[name] = mean_value
            
            # SoilGrids returns pH * 10, SOC in dg/kg (need g/kg)
            ph = values.get("phh2o", 65) / 10.0
            organic_carbon = values.get("soc", 15) / 10.0  # dg/kg to g/kg
            clay = values.get("clay", 25) / 10.0  # g/kg to %
            sand = values.get("sand", 40) / 10.0
            silt = values.get("silt", 35) / 10.0
            
            # Determine texture class
            texture_class = _classify_texture(clay, sand, silt)
            
            # Confidence based on how many values we got
            confidence = len(values) / 5.0
            
            return SoilData(
                ph=round(ph, 2),
                organic_carbon=round(organic_carbon, 2),
                clay=round(clay, 1),
                sand=round(sand, 1),
                silt=round(silt, 1),
                texture_class=texture_class,
                confidence=round(confidence, 2)
            )
    except Exception as e:
        print(f"[SoilGrids] Error fetching soil data: {e}")
        return None


def _classify_texture(clay: float, sand: float, silt: float) -> str:
    """Classify soil texture based on USDA texture triangle."""
    if clay >= 40:
        return "Clay"
    elif sand >= 85:
        return "Sand"
    elif silt >= 80:
        return "Silt"
    elif clay >= 27 and sand <= 52:
        return "Clay Loam"
    elif clay >= 20 and silt >= 28:
        return "Silty Clay Loam"
    elif sand >= 52 and clay < 20:
        return "Sandy Loam"
    elif silt >= 50:
        return "Silt Loam"
    else:
        return "Loam"


async def fetch_weather_data(lat: float, lng: float, years: int = 2) -> Optional[WeatherData]:
    """
    Fetch historical weather data from Open-Meteo Archive API.
    FREE - No API key required.
    
    API Docs: https://open-meteo.com/en/docs/historical-weather-api
    """
    end_date = datetime.now()
    start_date = end_date - timedelta(days=365 * years)
    
    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": lat,
        "longitude": lng,
        "start_date": start_date.strftime("%Y-%m-%d"),
        "end_date": end_date.strftime("%Y-%m-%d"),
        "daily": ["temperature_2m_max", "temperature_2m_min", "temperature_2m_mean", "precipitation_sum"],
        "timezone": "auto"
    }
    
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            daily = data.get("daily", {})
            temps_max = daily.get("temperature_2m_max", [])
            temps_min = daily.get("temperature_2m_min", [])
            temps_mean = daily.get("temperature_2m_mean", [])
            precip = daily.get("precipitation_sum", [])
            
            # Filter out None values
            temps_max = [t for t in temps_max if t is not None]
            temps_min = [t for t in temps_min if t is not None]
            temps_mean = [t for t in temps_mean if t is not None]
            precip = [p for p in precip if p is not None]
            
            if not temps_mean or not precip:
                return None
            
            # Calculate statistics
            temp_mean = sum(temps_mean) / len(temps_mean)
            temp_min = min(temps_min) if temps_min else temp_mean - 10
            temp_max = max(temps_max) if temps_max else temp_mean + 10
            precip_sum = sum(precip)
            precip_days = sum(1 for p in precip if p > 1.0)
            heat_stress = sum(1 for t in temps_max if t > 35)
            
            # Monthly aggregation (last 12 months)
            days_per_month = len(temps_mean) // 12 if len(temps_mean) >= 12 else len(temps_mean)
            monthly_temps = []
            monthly_precip = []
            
            for i in range(12):
                start_idx = i * days_per_month
                end_idx = start_idx + days_per_month
                if end_idx <= len(temps_mean):
                    monthly_temps.append(round(sum(temps_mean[start_idx:end_idx]) / days_per_month, 1))
                    monthly_precip.append(round(sum(precip[start_idx:end_idx]), 1))
            
            # Determine rainfall deviation (compare to typical 800-1200mm/year)
            annual_precip = precip_sum / years
            if annual_precip > 1200:
                deviation = "surplus"
            elif annual_precip < 600:
                deviation = "deficit"
            else:
                deviation = "normal"
            
            return WeatherData(
                temperature_mean=round(temp_mean, 1),
                temperature_min=round(temp_min, 1),
                temperature_max=round(temp_max, 1),
                precipitation_sum=round(precip_sum / years, 1),  # Annual average
                precipitation_days=precip_days // years,
                heat_stress_days=heat_stress // years,
                monthly_temps=monthly_temps,
                monthly_precip=monthly_precip,
                rainfall_deviation=deviation
            )
    except Exception as e:
        print(f"[Open-Meteo] Error fetching weather data: {e}")
        return None


async def fetch_proximity_data(lat: float, lng: float, radius_km: float = 10.0) -> Optional[ProximityData]:
    """
    Fetch proximity to features using OSM Overpass API.
    FREE - No API key required.
    
    API Docs: https://wiki.openstreetmap.org/wiki/Overpass_API
    """
    radius_m = radius_km * 1000
    
    # Overpass QL query for highways, towns, and water
    query = f"""
    [out:json][timeout:10];
    (
      way["highway"~"primary|secondary|tertiary|trunk"](around:{radius_m},{lat},{lng});
      node["place"~"town|city|village"](around:{radius_m},{lat},{lng});
      way["natural"="water"](around:{radius_m},{lat},{lng});
      way["waterway"](around:{radius_m},{lat},{lng});
    );
    out center;
    """
    
    url = "https://overpass-api.de/api/interpreter"
    
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.post(url, data={"data": query})
            response.raise_for_status()
            data = response.json()
            
            elements = data.get("elements", [])
            
            highways = []
            towns = []
            waters = []
            
            for el in elements:
                tags = el.get("tags", {})
                
                # Get center coordinates
                if "center" in el:
                    el_lat = el["center"]["lat"]
                    el_lng = el["center"]["lon"]
                elif "lat" in el:
                    el_lat = el["lat"]
                    el_lng = el["lon"]
                else:
                    continue
                
                dist = _haversine(lat, lng, el_lat, el_lng)
                
                if "highway" in tags:
                    highways.append((dist, tags.get("name", "Unnamed Road")))
                elif "place" in tags:
                    towns.append((dist, tags.get("name", "Unnamed Place")))
                elif "natural" in tags or "waterway" in tags:
                    waters.append((dist, tags.get("name", "Unnamed Water Body")))
            
            # Get nearest of each type
            highways.sort(key=lambda x: x[0])
            towns.sort(key=lambda x: x[0])
            waters.sort(key=lambda x: x[0])
            
            return ProximityData(
                nearest_highway_km=round(highways[0][0], 2) if highways else radius_km,
                nearest_town_km=round(towns[0][0], 2) if towns else radius_km,
                nearest_water_km=round(waters[0][0], 2) if waters else radius_km,
                highway_name=highways[0][1] if highways else None,
                town_name=towns[0][1] if towns else None,
                water_name=waters[0][1] if waters else None
            )
    except Exception as e:
        print(f"[Overpass] Error fetching proximity data: {e}")
        return None


async def fetch_location_info(lat: float, lng: float) -> Optional[LocationInfo]:
    """
    Reverse geocode coordinates using OSM Nominatim.
    FREE - No API key required (but respect rate limits: 1 req/sec).
    
    API Docs: https://nominatim.org/release-docs/develop/api/Reverse/
    """
    url = "https://nominatim.openstreetmap.org/reverse"
    params = {
        "lat": lat,
        "lon": lng,
        "format": "json",
        "addressdetails": 1,
        "zoom": 14
    }
    headers = {
        "User-Agent": "AgriNova/1.0 (land-intelligence-app)"
    }
    
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.get(url, params=params, headers=headers)
            response.raise_for_status()
            data = response.json()
            
            address = data.get("address", {})
            
            return LocationInfo(
                display_name=data.get("display_name", "Unknown Location"),
                village=address.get("village"),
                town=address.get("town"),
                city=address.get("city"),
                district=address.get("county") or address.get("state_district"),
                state=address.get("state"),
                country=address.get("country", "Unknown")
            )
    except Exception as e:
        print(f"[Nominatim] Error fetching location info: {e}")
        return None


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points in km using Haversine formula."""
    from math import radians, sin, cos, sqrt, atan2
    
    R = 6371  # Earth's radius in km
    
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    
    return R * c


async def fetch_all_external_data(lat: float, lng: float) -> dict:
    """
    Fetch all external data in parallel.
    Returns a dict with soil, weather, proximity, and location data.
    """
    soil_task = fetch_soil_data(lat, lng)
    weather_task = fetch_weather_data(lat, lng)
    proximity_task = fetch_proximity_data(lat, lng)
    location_task = fetch_location_info(lat, lng)
    
    soil, weather, proximity, location = await asyncio.gather(
        soil_task, weather_task, proximity_task, location_task,
        return_exceptions=True
    )
    
    # Handle exceptions
    if isinstance(soil, Exception):
        soil = None
    if isinstance(weather, Exception):
        weather = None
    if isinstance(proximity, Exception):
        proximity = None
    if isinstance(location, Exception):
        location = None
    
    return {
        "soil": soil,
        "weather": weather,
        "proximity": proximity,
        "location": location
    }
