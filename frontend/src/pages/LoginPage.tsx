import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

export function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const navigate = useNavigate()
    const setAuth = useAuthStore((s) => s.setAuth)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setIsLoading(true)

        try {
            const formData = new FormData()
            formData.append('username', email)
            formData.append('password', password)

            // 1. Get Token
            const tokenData = await api.login(formData)

            // Store token early to allow getMe to work if it needs it (though getMe usually takes token from store)
            // Actually we need to setAuth with token first, then get user.
            // But setAuth expects user object too.
            // So we might need to manually set token in store or pass it to interceptor?
            // Our interceptor reads from store. So we must set token in store.
            // But we don't have user yet.

            // Temporary solution: Create a partial update method in store or just set token with null user first?
            // Or just manually call getMe with header.

            // Better: Update store to allow partial updates or just fetch me using token
            useAuthStore.setState({ token: tokenData.access_token })

            // 2. Get User
            const user = await api.getMe()
            setAuth(tokenData.access_token, user)

            navigate('/')
        } catch (err: any) {
            console.error(err)
            setError(err.message || 'Login failed')
            // If failed, clear token
            useAuthStore.setState({ token: null })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
            <div className="w-full max-w-md space-y-8 p-8 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800">
                <div className="text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                        Sign in
                    </h2>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                        Welcome back to KKH Analysis
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4 rounded-md">
                        <div>
                            <Label htmlFor="email-address">Email address</Label>
                            <Input
                                id="email-address"
                                name="email"
                                type="email"
                                required
                                placeholder="email@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                            {error}
                        </div>
                    )}

                    <div>
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Signing in...' : 'Sign in'}
                        </Button>
                    </div>
                </form>

                <div className="text-center text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400">
                        Don't have an account?{' '}
                    </span>
                    <Link
                        to="/register"
                        className="font-medium text-emerald-600 hover:text-emerald-500"
                    >
                        Register
                    </Link>
                </div>
            </div>
        </div>
    )
}
