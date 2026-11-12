/** Normalised sky. Clip rules never see a provider payload. */
export interface WeatherConditions {
  rain: boolean
  snow: boolean
  clearing: boolean
  hot: boolean
  windy: boolean
  isDay: boolean
  raw?: {
    code?: number
    temperatureC?: number
    gustKmh?: number
    previousPrecipMm?: number
  }
}

/** A future iOS build can add WeatherKit. A commercial Android build can add its own provider. */
export interface WeatherProvider {
  id: string
  read(lat: number, lon: number): Promise<WeatherConditions | null>
}
