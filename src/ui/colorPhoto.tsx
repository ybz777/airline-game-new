import { getFleetAircraftImage } from '../data/aircraft'

export function ColoredAircraft({
  typeId,
  color,
  alt,
  className = '',
}: {
  typeId: string
  color: string
  alt: string
  className?: string
}) {
  const src = getFleetAircraftImage(typeId, color)
  return (
    <div className={`photo ${className}`}>
      <img src={src} alt={alt} />
    </div>
  )
}
