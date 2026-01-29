'use client'

import { useState, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface InviteCode {
  id: string
  code: string
  maxUses: number
  usedCount: number
  expiresAt: string | null
  enabled: boolean
  note: string | null
  createdAt: string
  usedAt: string | null
}

export default function AdminInvitePage() {
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authError, setAuthError] = useState('')
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([])
  const [loading, setLoading] = useState(false)

  // 生成新邀请码的表单状态
  const [newCodeForm, setNewCodeForm] = useState({
    maxUses: 1,
    expiresInDays: 30,
    note: '',
  })
  const [creating, setCreating] = useState(false)

  // 获取邀请码列表
  const fetchInviteCodes = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/invite/admin', {
        headers: {
          'x-admin-password': password,
        },
      })
      const data = await response.json()
      if (data.success) {
        setInviteCodes(data.data)
      }
    } catch (error) {
      console.error('获取邀请码列表失败:', error)
    } finally {
      setLoading(false)
    }
  }, [password])

  // 验证管理员密码
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    setLoading(true)

    try {
      const response = await fetch('/api/invite/admin', {
        headers: {
          'x-admin-password': password,
        },
      })
      const data = await response.json()

      if (data.success) {
        setIsAuthenticated(true)
        setInviteCodes(data.data)
      } else {
        setAuthError(data.error || '密码错误')
      }
    } catch {
      setAuthError('网络错误')
    } finally {
      setLoading(false)
    }
  }

  // 创建新邀请码
  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    try {
      const response = await fetch('/api/invite/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify(newCodeForm),
      })
      const data = await response.json()

      if (data.success) {
        setNewCodeForm({ maxUses: 1, expiresInDays: 30, note: '' })
        fetchInviteCodes()
      }
    } catch (error) {
      console.error('创建邀请码失败:', error)
    } finally {
      setCreating(false)
    }
  }

  // 切换邀请码启用状态
  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    try {
      const response = await fetch('/api/invite/admin', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({ id, enabled: !enabled }),
      })
      const data = await response.json()

      if (data.success) {
        fetchInviteCodes()
      }
    } catch (error) {
      console.error('更新邀请码失败:', error)
    }
  }

  // 删除邀请码
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个邀请码吗？')) return

    try {
      const response = await fetch(`/api/invite/admin?id=${id}`, {
        method: 'DELETE',
        headers: {
          'x-admin-password': password,
        },
      })
      const data = await response.json()

      if (data.success) {
        fetchInviteCodes()
      }
    } catch (error) {
      console.error('删除邀请码失败:', error)
    }
  }

  // 复制邀请码
  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      alert('已复制到剪贴板')
    } catch {
      alert('复制失败，请手动复制')
    }
  }

  // 格式化日期
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('zh-CN')
  }

  // 检查是否过期
  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false
    return new Date() > new Date(expiresAt)
  }

  // 刷新列表
  useEffect(() => {
    if (isAuthenticated) {
      fetchInviteCodes()
    }
  }, [isAuthenticated, fetchInviteCodes])

  // 未认证 - 显示密码输入
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md p-8">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h1 className="text-2xl font-bold text-gray-900 text-center mb-6">
              邀请码管理
            </h1>
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  管理员密码
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入管理员密码"
                  error={!!authError}
                />
                {authError && (
                  <p className="mt-1 text-sm text-red-500">{authError}</p>
                )}
              </div>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={loading}
              >
                登录
              </Button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // 已认证 - 显示管理面板
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">邀请码管理</h1>
          <Button
            variant="ghost"
            onClick={() => {
              setIsAuthenticated(false)
              setPassword('')
            }}
          >
            退出登录
          </Button>
        </div>

        {/* 创建新邀请码 */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            生成新邀请码
          </h2>
          <form onSubmit={handleCreateCode} className="flex flex-wrap gap-4 items-end">
            <div className="w-32">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                最大使用次数
              </label>
              <Input
                type="number"
                min="1"
                value={newCodeForm.maxUses}
                onChange={(e) =>
                  setNewCodeForm({ ...newCodeForm, maxUses: parseInt(e.target.value) || 1 })
                }
              />
            </div>
            <div className="w-32">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                有效天数
              </label>
              <Input
                type="number"
                min="0"
                value={newCodeForm.expiresInDays}
                onChange={(e) =>
                  setNewCodeForm({
                    ...newCodeForm,
                    expiresInDays: parseInt(e.target.value) || 0,
                  })
                }
                placeholder="0=永久"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                备注（可选）
              </label>
              <Input
                type="text"
                value={newCodeForm.note}
                onChange={(e) =>
                  setNewCodeForm({ ...newCodeForm, note: e.target.value })
                }
                placeholder="例如：发给 xxx"
              />
            </div>
            <Button type="submit" variant="primary" loading={creating}>
              生成邀请码
            </Button>
          </form>
        </div>

        {/* 邀请码列表 */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              邀请码列表 ({inviteCodes.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">加载中...</div>
          ) : inviteCodes.length === 0 ? (
            <div className="p-8 text-center text-gray-500">暂无邀请码</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      邀请码
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      使用情况
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      过期时间
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      备注
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      创建时间
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {inviteCodes.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                          {item.code}
                        </code>
                        <button
                          onClick={() => handleCopy(item.code)}
                          className="ml-2 text-gray-400 hover:text-gray-600"
                          title="复制"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <span className={item.usedCount >= item.maxUses ? 'text-red-500' : 'text-gray-600'}>
                          {item.usedCount} / {item.maxUses}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {!item.enabled ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                            已禁用
                          </span>
                        ) : isExpired(item.expiresAt) ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-600">
                            已过期
                          </span>
                        ) : item.usedCount >= item.maxUses ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-600">
                            已用完
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-600">
                            可用
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.expiresAt ? formatDate(item.expiresAt) : '永久'}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500 max-w-[150px] truncate">
                        {item.note || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm space-x-2">
                        <button
                          onClick={() => handleToggleEnabled(item.id, item.enabled)}
                          className={`${
                            item.enabled
                              ? 'text-yellow-600 hover:text-yellow-700'
                              : 'text-green-600 hover:text-green-700'
                          }`}
                        >
                          {item.enabled ? '禁用' : '启用'}
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
