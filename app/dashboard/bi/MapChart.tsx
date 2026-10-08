"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const CITY_COORDS: Record<string, [number, number]> = {
  "são paulo": [-23.5505, -46.6333],
  "sao paulo": [-23.5505, -46.6333],
  "rio de janeiro": [-22.9068, -43.1729],
  "belo horizonte": [-19.9167, -43.9345],
  "salvador": [-12.9714, -38.5014],
  "fortaleza": [-3.7172, -38.5433],
  "curitiba": [-25.4290, -49.2710],
  "manaus": [-3.1190, -60.0217],
  "recife": [-8.0578, -34.8829],
  "porto alegre": [-30.0346, -51.2177],
  "goiânia": [-16.6799, -49.2550],
  "goiania": [-16.6799, -49.2550],
  "belém": [-1.4558, -48.5044],
  "belem": [-1.4558, -48.5044],
  "guarulhos": [-23.4538, -46.5333],
  "campinas": [-22.9099, -47.0626],
  "joinville": [-26.3045, -48.8487],
  "florianópolis": [-27.5954, -48.5480],
  "florianopolis": [-27.5954, -48.5480],
  "são luís": [-2.5297, -44.3028],
  "sao luis": [-2.5297, -44.3028],
  "maceió": [-9.6658, -35.7350],
  "maceio": [-9.6658, -35.7350],
  "natal": [-5.7793, -35.2009],
  "teresina": [-5.0892, -42.8016],
  "campo grande": [-20.4697, -54.6201],
  "são bernardo do campo": [-23.6939, -46.5650],
  "são josé dos campos": [-23.1896, -45.8841],
  "ribeirão preto": [-21.1767, -47.8208],
  "uberlândia": [-18.9186, -48.2772],
  "sorocaba": [-23.5015, -47.4526],
  "contagem": [-19.9317, -44.0536],
  "aracaju": [-10.9472, -37.0731],
  "feira de santana": [-12.2664, -38.9663],
  "juiz de fora": [-21.7642, -43.3503],
  "londrina": [-23.3045, -51.1696],
  "ananindeua": [-1.3656, -48.3728],
  "porto velho": [-8.7612, -63.9004],
  "cuiabá": [-15.6014, -56.0979],
  "cuiaba": [-15.6014, -56.0979],
  "macapá": [0.0356, -51.0705],
  "macapa": [0.0356, -51.0705],
  "vitória": [-20.3155, -40.3128],
  "vitoria": [-20.3155, -40.3128],
  "serra": [-20.1286, -40.3078],
  "vila velha": [-20.3297, -40.2920],
  "santo andré": [-23.6639, -46.5383],
  "osasco": [-23.5329, -46.7919],
  "duque de caxias": [-22.7856, -43.3117],
  "nova iguaçu": [-22.7592, -43.4511],
  "niterói": [-22.8833, -43.1036],
  "são gonçalo": [-22.8268, -43.0610],
};

interface CityData {
  city: string;
  count: number;
}

export default function MapChart({ cities }: { cities: CityData[] }) {
  useEffect(() => {
    // Fix leaflet icon issue in Next.js
    const L = require("leaflet"); // eslint-disable-line
    delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    });
  }, []);

  const maxCount = Math.max(...cities.map((c) => c.count), 1);

  const mapped = cities
    .map((c) => {
      const key = c.city.toLowerCase().replace(/\s+(sp|rj|mg|ba|pr|rs|sc|go|ce|pe|am|pa|ma|rn|pi|ms|mt|es|al|se|ro|ap|ac|rr|to|df)\s*$/i, "").trim();
      const coords = CITY_COORDS[key];
      return coords ? { ...c, coords } : null;
    })
    .filter(Boolean) as (CityData & { coords: [number, number] })[];

  return (
    <MapContainer
      center={[-15.7801, -47.9292]}
      zoom={4}
      style={{ width: "100%", height: "100%", borderRadius: 8 }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        opacity={0.7}
      />
      {mapped.map((c, i) => (
        <CircleMarker
          key={i}
          center={c.coords}
          radius={6 + (c.count / maxCount) * 18}
          pathOptions={{ color: "#dc2626", fillColor: "#dc2626", fillOpacity: 0.7, weight: 1 }}
        >
          <Tooltip direction="top" offset={[0, -10]}>
            <strong>{c.city}</strong>: {c.count} lead{c.count > 1 ? "s" : ""}
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
