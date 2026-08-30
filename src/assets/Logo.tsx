import React from 'react'
import logoImg from './logo.png'

interface LogoProps {
  className?: string
  size?: number
  showText?: boolean
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 22,
  showText = true
}) => {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* New Gothic Ornate Logo Icon */}
      <img
        src={logoImg}
        alt="VRCFX"
        style={{ width: size, height: size }}
        className="rounded-md object-contain border border-card shrink-0"
      />

      {showText && (
        <span className="font-black text-sm tracking-widest text-white font-sans uppercase">
          VRCFX
        </span>
      )}
    </div>
  )
}
