'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { EyeOpenIcon, EyeClosedIcon } from '@radix-ui/react-icons';
import axios, { AxiosError } from 'axios';
import { setCurrentUser } from '@/store/reducers/authSlice';

interface ErrorResponse {
  message?: string;
}

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const dispatch = useDispatch();

  useEffect(() => {
    if (localStorage.getItem('isAuthenticated')) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post('/api/auth/login', {
        email: formData.email,
        password: formData.password,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true,
      });

      if (response.data.success) {
        localStorage.setItem('isAuthenticated', 'true');
        dispatch(setCurrentUser(response.data.user));
        toast.success('Login successful!');
        router.push('/dashboard');
      } else {
        toast.error(response.data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      const axiosError = error as AxiosError<ErrorResponse>;
      const errorMessage = axiosError.response?.data?.message ||
                          axiosError.message ||
                          'An error occurred during login';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat relative"
      style={{
        backgroundImage: `url('https://images.unsplash.com/photo-1519225421980-715cb0215aed?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2940&q=80')`,
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>

      <div className="w-full max-w-md mx-auto p-8 relative z-10">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/20">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold tracking-tighter text-white">
              The Bridal House
            </h1>
            <p className="text-gray-200">
              Please enter your details to sign in
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 mt-8">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200">Email</label>
              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                className="flex h-10 w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  className="flex h-10 w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? (
                    <EyeClosedIcon className="h-4 w-4" />
                  ) : (
                    <EyeOpenIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  className="rounded border-gray-400 bg-white/10 text-blue-600"
                />
                <span className="text-sm text-gray-200">Remember me</span>
              </label>
              <a
                href="#forgot-password"
                className="text-sm text-blue-300 hover:text-blue-200"
              >
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium bg-white/20 hover:bg-white/30 text-white backdrop-blur-lg border border-white/20 h-10 px-4 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Signing in...
                </div>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
} 