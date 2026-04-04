import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import apiClient from '@/lib/api';
import { ApiKey, ApiKeyCreated } from '@/types/api';
import axios from 'axios';

export const useApiKeys = () => {
  return useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const response = await apiClient.get<ApiKey[]>('/account/api-keys');
      return response.data;
    },
  });
};

export const useCreateApiKey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { appName: string; prefix: 'sk_live' | 'sk_test' }) => {
      const response = await apiClient.post<ApiKeyCreated>('/account/api-keys', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success(`API key created for "${data.appName}"`);
    },
    onError: (error) => {
      const message =
        axios.isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : 'Failed to create API key';
      toast.error(message);
    },
  });
};

export const useRevokeApiKey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (keyId: string) => {
      await apiClient.delete(`/account/api-keys/${keyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success('API key revoked');
    },
    onError: (error) => {
      const message =
        axios.isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : 'Failed to revoke API key';
      toast.error(message);
    },
  });
};

export const useRevokeAllApiKeys = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await apiClient.post('/account/api-keys/revoke-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success('All API keys revoked');
    },
    onError: (error) => {
      const message =
        axios.isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : 'Failed to revoke API keys';
      toast.error(message);
    },
  });
};
