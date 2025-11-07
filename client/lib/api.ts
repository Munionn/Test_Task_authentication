import axios, { AxiosError } from 'axios';


const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const api = axios.create({
  baseURL: `${API_URL}/auth`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to log requests (for debugging)
api.interceptors.request.use(
  (config) => {
    // Log request details in development
    if (process.env.NODE_ENV === 'development') {
      console.log('API Request:', {
        method: config.method,
        url: config.url,
        baseURL: config.baseURL,
        withCredentials: config.withCredentials,
      });
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const isLogoutRequest = error.config?.url?.includes('/logout');
      if (!isLogoutRequest) {
        console.error('Unauthorized - token may be expired');
      }
    }
    return Promise.reject(error);
  }
);

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface UpdateUserData {
  email?: string;
  name?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  message?: string;
}

export interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp?: string;
  path?: string;
  method?: string;
}

export const authApi = {
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/register', data);
    return response.data;
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/login', data);
    return response.data;
  },

  logout: async (): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/logout');
    return response.data;
  },

  getProfile: async (): Promise<User> => {
    const response = await api.get<User>('/profile');
    return response.data;
  },

  updateProfile: async (data: UpdateUserData): Promise<AuthResponse> => {
    const response = await api.put<AuthResponse>('/profile', data);
    return response.data;
  },

  refreshToken: async (refreshToken: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/refresh', {
      refresh_token: refreshToken,
    });
    return response.data;
  },
};

export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ErrorResponse>;
    if (axiosError.response?.data) {
      const data = axiosError.response.data;
      if (Array.isArray(data.message)) {
        return data.message.join(', ');
      }
      return data.message || 'An error occurred';
    }
    return error.message || 'Network error';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

export const getErrorMessages = (error: unknown): string[] => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ErrorResponse>;
    if (axiosError.response?.data) {
      const data = axiosError.response.data;
      if (Array.isArray(data.message)) {
        return data.message;
      }
      return [data.message || 'An error occurred'];
    }
    return [error.message || 'Network error'];
  }
  if (error instanceof Error) {
    return [error.message];
  }
  return ['An unexpected error occurred'];
};

