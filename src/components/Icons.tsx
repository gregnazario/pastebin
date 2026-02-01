/**
 * Clean, modern SVG icon components for the Secure Pastebin application.
 * All icons are designed to be inline-friendly and scale with text.
 */

import type { CSSProperties, ReactNode } from 'react'

interface IconProps {
  size?: number | string
  className?: string
  style?: CSSProperties
  'aria-hidden'?: boolean
}

const defaultProps: IconProps = {
  size: '1em',
  'aria-hidden': true,
}

/**
 * Pastebin Logo Icon - Document with lock
 * Used in header, title, and branding
 */
export function LogoIcon({ size = defaultProps.size, className, style, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={className}
      style={style}
      fill="none"
      aria-hidden={props['aria-hidden'] ?? true}
    >
      {/* Document body */}
      <path
        d="M160 64h128l80 80v288c0 17.7-14.3 32-32 32H160c-17.7 0-32-14.3-32-32V96c0-17.7 14.3-32 32-32z"
        fill="currentColor"
        opacity="0.2"
      />
      <path
        d="M160 64h128l80 80v288c0 17.7-14.3 32-32 32H160c-17.7 0-32-14.3-32-32V96c0-17.7 14.3-32 32-32z"
        stroke="currentColor"
        strokeWidth="24"
        fill="none"
      />
      {/* Document fold */}
      <path d="M288 64v80h80" stroke="currentColor" strokeWidth="24" fill="none" />
      {/* Document lines */}
      <rect x="168" y="200" width="80" height="16" rx="8" fill="currentColor" opacity="0.5" />
      <rect x="168" y="240" width="120" height="16" rx="8" fill="currentColor" opacity="0.5" />
      {/* Lock body */}
      <rect x="280" y="300" width="100" height="80" rx="12" fill="currentColor" />
      {/* Lock shackle */}
      <path
        d="M300 300v-30c0-22 18-40 30-40s30 18 30 40v30"
        stroke="currentColor"
        strokeWidth="16"
        fill="none"
        strokeLinecap="round"
      />
      {/* Lock keyhole */}
      <circle cx="330" cy="340" r="10" fill="var(--bg, #1a1a2e)" />
      <rect x="326" y="340" width="8" height="16" rx="4" fill="var(--bg, #1a1a2e)" />
    </svg>
  )
}

/**
 * Lock/Encryption Icon
 * For security-related features
 */
export function LockIcon({ size = defaultProps.size, className, style, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props['aria-hidden'] ?? true}
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      <circle cx="12" cy="16" r="1" fill="currentColor" />
    </svg>
  )
}

/**
 * Shield Icon
 * For protection and security features
 */
export function ShieldIcon({ size = defaultProps.size, className, style, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props['aria-hidden'] ?? true}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}

/**
 * Link Icon
 * For sharing and URL-related features
 */
export function LinkIcon({ size = defaultProps.size, className, style, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props['aria-hidden'] ?? true}
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

/**
 * File/Document Icon
 * For file-related features
 */
export function FileIcon({ size = defaultProps.size, className, style, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props['aria-hidden'] ?? true}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  )
}

/**
 * Clipboard/Copy Icon
 * For copy-to-clipboard actions
 */
export function ClipboardIcon({ size = defaultProps.size, className, style, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props['aria-hidden'] ?? true}
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

/**
 * Key Icon
 * For password and key-related features
 */
export function KeyIcon({ size = defaultProps.size, className, style, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props['aria-hidden'] ?? true}
    >
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  )
}

/**
 * Sun Icon
 * For light mode toggle
 */
export function SunIcon({ size = defaultProps.size, className, style, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props['aria-hidden'] ?? true}
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

/**
 * Moon Icon
 * For dark mode toggle
 */
export function MoonIcon({ size = defaultProps.size, className, style, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props['aria-hidden'] ?? true}
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

/**
 * Folder Icon
 * For file browser/upload
 */
export function FolderIcon({ size = defaultProps.size, className, style, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props['aria-hidden'] ?? true}
    >
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}

/**
 * Download Icon
 * For file drop/download
 */
export function DownloadIcon({ size = defaultProps.size, className, style, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props['aria-hidden'] ?? true}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7,10 12,15 17,10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

/**
 * Eye Icon
 * For show password
 */
export function EyeIcon({ size = defaultProps.size, className, style, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props['aria-hidden'] ?? true}
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

/**
 * Eye Off Icon
 * For hide password
 */
export function EyeOffIcon({ size = defaultProps.size, className, style, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props['aria-hidden'] ?? true}
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

/**
 * Dice Icon
 * For generating random values
 */
export function DiceIcon({ size = defaultProps.size, className, style, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props['aria-hidden'] ?? true}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
      <circle cx="15.5" cy="8.5" r="1.5" fill="currentColor" />
      <circle cx="8.5" cy="15.5" r="1.5" fill="currentColor" />
      <circle cx="15.5" cy="15.5" r="1.5" fill="currentColor" />
    </svg>
  )
}

/**
 * Warning/Alert Icon
 * For warnings and alerts
 */
export function AlertIcon({ size = defaultProps.size, className, style, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props['aria-hidden'] ?? true}
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

/**
 * Check/Success Icon
 * For success states
 */
export function CheckIcon({ size = defaultProps.size, className, style, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props['aria-hidden'] ?? true}
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22,4 12,14.01 9,11.01" />
    </svg>
  )
}

/**
 * X/Cancel Icon
 * For cancel/no states
 */
export function XCircleIcon({ size = defaultProps.size, className, style, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props['aria-hidden'] ?? true}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  )
}

/**
 * Cloud Icon
 * For cloud storage
 */
export function CloudIcon({ size = defaultProps.size, className, style, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props['aria-hidden'] ?? true}
    >
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    </svg>
  )
}

/**
 * Settings/Wrench Icon
 * For technical details
 */
export function WrenchIcon({ size = defaultProps.size, className, style, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props['aria-hidden'] ?? true}
    >
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  )
}

/**
 * Chain/Decentralized Icon
 * For blockchain/decentralized features
 */
export function ChainIcon({ size = defaultProps.size, className, style, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props['aria-hidden'] ?? true}
    >
      <rect x="1" y="5" width="6" height="14" rx="2" />
      <rect x="17" y="5" width="6" height="14" rx="2" />
      <path d="M7 12h10" />
      <path d="M9 8h6" />
      <path d="M9 16h6" />
    </svg>
  )
}

/**
 * Wave/Welcome Icon
 * For onboarding welcome
 */
export function WaveIcon({ size = defaultProps.size, className, style, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props['aria-hidden'] ?? true}
    >
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
      <path d="M8.93 13.02A5 5 0 0 1 14 8v0" />
      <path d="M18 11c0-.72-.1-1.41-.27-2.06" />
      <path d="M14 11v3a3 3 0 0 0 6 0v-1" />
      <path d="M8 15v-1a5 5 0 0 0-2-4" />
      <path d="M4 15v1a7 7 0 0 0 14 0v-3" />
    </svg>
  )
}

/**
 * Upload Icon
 * For upload actions
 */
export function UploadIcon({ size = defaultProps.size, className, style, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props['aria-hidden'] ?? true}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17,8 12,3 7,8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

/**
 * Lock Closed Icon (small, simple)
 * For inline security indicators
 */
export function LockClosedIcon({
  size = defaultProps.size,
  className,
  style,
  ...props
}: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props['aria-hidden'] ?? true}
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

/**
 * Note/Text Icon
 * For note/text input mode
 */
export function NoteIcon({ size = defaultProps.size, className, style, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props['aria-hidden'] ?? true}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
}

/**
 * Quantum/Atom Icon
 * For post-quantum security features
 */
export function QuantumIcon({ size = defaultProps.size, className, style, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props['aria-hidden'] ?? true}
    >
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <ellipse cx="12" cy="12" rx="10" ry="4" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
    </svg>
  )
}

/**
 * Icon wrapper component for consistent sizing with text
 * Renders an icon inline with text at the same size
 */
export function InlineIcon({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <span className={`inline-icon ${className || ''}`}>{children}</span>
}
