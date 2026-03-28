'use client'

interface Props {
  href: string
  title: string
}

export function MapsLink({ href, title }: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      className="flex-shrink-0 text-blue-500 hover:text-blue-700"
      title={title}
    >
      📍
    </a>
  )
}
