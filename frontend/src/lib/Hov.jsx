// Tiny hover-style helper. The design encodes hover states inline
// (style-hover="{...}"); this merges a base style with a hover style on mouseover.
import React, { useState } from 'react'

export default function Hov({ as = 'div', style, hoverStyle, children, ...rest }) {
  const [hover, setHover] = useState(false)
  const Tag = as
  return (
    <Tag
      style={hover ? { ...style, ...hoverStyle } : style}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      {...rest}
    >
      {children}
    </Tag>
  )
}
