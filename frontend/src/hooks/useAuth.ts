import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import apiClient from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { AuthResponse } from '@/types/api';
import axios from 'axios';

export const useRegister = () => {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const response = await apiClient.post<AuthResponse>('/auth/register', data);
      return response.data;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken);
      toast.success('Account created successfully');
    },
    onError: (error) => {
      const message =
        axios.isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : 'Registration failed';
      toast.error(message);
    },
  });
};

export const useLogin = () => {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const response = await apiClient.post<AuthResponse>('/auth/login', data);
      return response.data;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken);
      toast.success('Logged in successfully');
    },
    onError: (error) => {
      const message =
        axios.isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : 'Login failed';
      toast.error(message);
    },
  });
};

export const useLogout = () => {
  const logout = useAuthStore((s) => s.logout);

  return useMutation({
    mutationFn: async () => {
      await apiClient.post('/auth/logout');
    },
    onSuccess: () => {
      logout();
      toast.success('Logged out successfully');
    },
  });
};
