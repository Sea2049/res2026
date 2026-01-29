'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function InvitePage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!code.trim()) {
      setError('请输入邀请码')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/invite/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: code.trim() }),
      })

      const data = await response.json()

      if (data.success) {
        router.push('/')
        router.refresh()
      } else {
        setError(data.error || '验证失败')
      }
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-md p-8">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-reddit-orange"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Reddit Insight Tool
            </h1>
            <p className="text-gray-500 mt-2">请输入邀请码以访问</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Input
                type="text"
                placeholder="请输入邀请码"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value)
                  setError('')
                }}
                error={!!error}
                className="text-center text-lg tracking-widest"
                autoFocus
              />
              {error && (
                <p className="mt-2 text-sm text-red-500 text-center">{error}</p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
            >
              验证并进入
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            如需获取邀请码，请联系管理员
          </p>
        </div>
      </div>
    </div>
  )
}
