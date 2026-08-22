import { WeatherIcon } from './icons'

// The compact right-aligned reading on a list card: icon + high↑ low↓.
export function WeatherSummaryLine({ weather }) {
  if (!weather) return null
  return (
    <span className="ml-auto flex items-center gap-2 text-xs text-gray-60" title={weather.summary}>
      <WeatherIcon icon={weather.icon} className="h-5 w-5" />
      <span>
        {weather.high}°F<span className="text-gray-40">↑</span>
      </span>
      <span>
        {weather.low}°F<span className="text-gray-40">↓</span>
      </span>
    </span>
  )
}

// The fuller block used in the detail page's right rail and in the add/edit
// form under "Include Weather Conditions": conditions summary, high/low, and
// the wind / humidity / total precipitation readings.
export function WeatherBlock({ weather, capturedLabel }) {
  if (!weather) return null
  return (
    <div>
      {capturedLabel && (
        <div className="mb-2 text-xs text-gray-60">
          {weather.summary} <span className="ml-2 text-gray-50">{capturedLabel}</span>
        </div>
      )}
      <div className="flex items-start gap-3">
        <WeatherIcon icon={weather.icon} className="h-11 w-11 shrink-0" />
        <div className="text-right">
          <div className="text-xl font-semibold text-gray-90">{weather.high}° F</div>
          <div className="text-sm text-gray-50">{weather.low}° F</div>
        </div>
        <dl className="ml-3 space-y-0.5 text-xs text-gray-70">
          <div className="flex gap-1">
            <dt>Wind:</dt>
            <dd>{weather.wind} mph</dd>
          </div>
          <div className="flex gap-1">
            <dt>Humidity:</dt>
            <dd>{weather.humidity}%</dd>
          </div>
          <div className="flex gap-1">
            <dt>Total precipitation:</dt>
            <dd>{weather.precipitation}"</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
