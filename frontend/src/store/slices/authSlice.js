import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authAPI } from '../../api';

export const loginUser = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const { data } = await authAPI.login(credentials);
    const { user, accessToken, refreshToken } = data.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    if (user.schoolId) localStorage.setItem('schoolId', user.schoolId);
    return { user, accessToken };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Login failed');
  }
});

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  try { await authAPI.logout(); } catch {}
  localStorage.clear();
});

export const fetchMe = createAsyncThunk('auth/fetchMe', async (_, { rejectWithValue }) => {
  try {
    const { data } = await authAPI.getMe();
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed');
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null, school: null,
    accessToken: localStorage.getItem('accessToken') || null,
    isAuthenticated: !!localStorage.getItem('accessToken'),
    loading: false, error: null, initialized: false,
  },
  reducers: {
    clearError: (s) => { s.error = null; },
    setSchool:  (s, a) => { s.school = a.payload; },
  },
  extraReducers: (b) => {
    b.addCase(loginUser.pending,   (s) => { s.loading = true; s.error = null; })
     .addCase(loginUser.fulfilled, (s, a) => { s.loading = false; s.user = a.payload.user; s.accessToken = a.payload.accessToken; s.isAuthenticated = true; s.initialized = true; })
     .addCase(loginUser.rejected,  (s, a) => { s.loading = false; s.error = a.payload; })
     .addCase(logoutUser.fulfilled,(s) => { s.user = null; s.school = null; s.accessToken = null; s.isAuthenticated = false; })
     .addCase(fetchMe.fulfilled,   (s, a) => { s.user = a.payload.user; s.school = a.payload.school; s.initialized = true; })
     .addCase(fetchMe.rejected,    (s) => { s.initialized = true; });
  },
});
export const { clearError, setSchool } = authSlice.actions;
export default authSlice.reducer;
