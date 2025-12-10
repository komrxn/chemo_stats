import { useState, useEffect } from 'react'
import { api, User } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

export function AdminPage() {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()
    const currentUser = useAuthStore((s) => s.user)

    useEffect(() => {
        if (currentUser && !currentUser.is_superuser) {
            navigate('/')
            return
        }

        loadUsers()
    }, [currentUser, navigate])

    const loadUsers = async () => {
        try {
            const data = await api.admin.getUsers()
            setUsers(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleApprove = async (id: number) => {
        try {
            await api.admin.approveUser(id)
            setUsers(users.map(u => u.id === id ? { ...u, is_approved: true } : u))
        } catch (error) {
            console.error(error)
        }
    }

    if (loading) return <div className="p-8 text-text-secondary">Loading...</div>

    return (
        <div className="container mx-auto p-8 max-w-4xl">
            <div className="mb-8 flex items-center justify-between">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-accent to-accent-hover bg-clip-text text-transparent">
                    Admin Panel
                </h1>
                <Button variant="outline" onClick={() => navigate('/')}>
                    Back to Dashboard
                </Button>
            </div>

            <div className="rounded-lg border border-surface-border bg-surface-card overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-surface-secondary text-text-secondary">
                        <tr>
                            <th className="px-6 py-3 font-medium">Email</th>
                            <th className="px-6 py-3 font-medium">Status</th>
                            <th className="px-6 py-3 font-medium">Role</th>
                            <th className="px-6 py-3 font-medium">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-surface-hover/50 transition-colors">
                                <td className="px-6 py-4 font-medium text-text-primary">{user.email}</td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${user.is_approved
                                            ? 'bg-green-500/10 text-green-400 ring-green-500/20'
                                            : 'bg-yellow-500/10 text-yellow-400 ring-yellow-500/20'
                                        }`}>
                                        {user.is_approved ? 'Approved' : 'Pending'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-text-secondary">
                                    {user.is_superuser ? 'Superuser' : 'User'}
                                </td>
                                <td className="px-6 py-4">
                                    {!user.is_approved && (
                                        <Button
                                            size="sm"
                                            onClick={() => handleApprove(user.id)}
                                            className="h-8"
                                        >
                                            Approve
                                        </Button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
