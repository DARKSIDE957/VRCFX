import React, { useState } from 'react'
import { Lock, User, KeyRound, ShieldCheck, Mail, AlertCircle, Loader2, X } from 'lucide-react'
import { VRCUser } from '../types'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (user: VRCUser) => void
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [twoFactorType, setTwoFactorType] = useState<'totp' | 'emailOtp' | null>(null)
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) {
      setError('Please enter your VRChat username/email and password')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const res = await window.electronAPI.login({ username, password })
      if (res.success && res.user) {
        onSuccess(res.user)
        onClose()
      } else if (res.requires2FA && res.requires2FA.length > 0) {
        if (res.requires2FA.includes('emailOtp')) {
          setTwoFactorType('emailOtp')
        } else {
          setTwoFactorType('totp')
        }
      } else {
        setError(res.error || 'Login failed. Please check your credentials.')
      }
    } catch (err: any) {
      setError(err?.message || 'Connection error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!twoFactorCode || twoFactorCode.trim().length < 6) {
      setError('Please enter a valid 6-digit verification code')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const res = await window.electronAPI.verify2FA(twoFactorCode, twoFactorType || 'totp')
      if (res.success) {
        const session = await window.electronAPI.checkSession()
        if (session.success && session.user) {
          onSuccess(session.user)
        }
        onClose()
      } else {
        setError(res.error || 'Invalid 2FA code. Please try again.')
      }
    } catch (err: any) {
      setError(err?.message || 'Verification error.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 animate-fade-in-page">
      <div className="w-full max-w-md gothic-panel p-7 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-theme-muted hover:text-theme-primary p-1 rounded-md hover:bg-white/[0.05] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <h2 className="text-lg font-semibold text-theme-primary">
            {twoFactorType ? 'Two-factor verification' : 'Sign in to VRChat'}
          </h2>
          <p className="text-xs text-theme-muted mt-1 max-w-sm">
            {twoFactorType === 'emailOtp'
              ? 'Enter the 6-digit code sent to your registered VRChat email address.'
              : twoFactorType === 'totp'
              ? 'Enter the 6-digit security code from your authenticator app.'
              : 'Connect your account to sync friends list, world discovery, and inactivity cleaner.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2.5 p-3 rounded-lg bg-accent-subtle border border-accent text-accent text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!twoFactorType ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-theme-secondary mb-1.5">
                Username or Email
              </label>
              <div className="relative flex items-center">
                <User className="absolute left-3.5 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="VRChat Username or Email"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg app-input text-xs"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-theme-secondary mb-1.5">
                Password
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 w-4 h-4 text-white/40" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg app-input text-xs"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2 py-1">
              <input
                type="checkbox"
                id="rememberMe"
                defaultChecked
                className="w-4 h-4 rounded border-white/20 bg-black/40 text-crimson-600 focus:ring-crimson-500 accent-crimson-600 cursor-pointer"
              />
              <label htmlFor="rememberMe" className="text-xs text-white/60 select-none cursor-pointer font-medium">
                Remember session on this computer
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-crimson-primary w-full mt-2 py-2.5 text-xs font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Sign In to VRChat</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify2FA} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-theme-secondary mb-1.5">
                {twoFactorType === 'emailOtp' ? 'Email Code' : 'Authenticator App Code'}
              </label>
              <div className="relative flex items-center">
                {twoFactorType === 'emailOtp' ? (
                  <Mail className="absolute left-3.5 w-4 h-4 text-white/40" />
                ) : (
                  <ShieldCheck className="absolute left-3.5 w-4 h-4 text-white/40" />
                )}
                <input
                  type="text"
                  maxLength={6}
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg app-input text-center tracking-[0.3em] font-mono text-base"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 mt-3">
              <button
                type="button"
                onClick={() => setTwoFactorType(null)}
                className="btn-gothic-secondary w-1/3 py-2 text-xs font-medium"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading || twoFactorCode.length < 6}
                className="btn-crimson-primary w-2/3 py-2 text-xs font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify Code</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        <div className="mt-5 pt-4 border-t border-theme text-center">
          <p className="text-[10px] text-theme-muted leading-relaxed">
            Credentials and session tokens are encrypted securely on your computer and communicated directly to VRChat.
          </p>
        </div>
      </div>
    </div>
  )
}
