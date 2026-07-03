import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { teacherAPI } from '../../api';
export const fetchTeachers = createAsyncThunk('teachers/fetchAll', async (params, { rejectWithValue }) => {
  try { const { data } = await teacherAPI.getAll(params); return data.data; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});
const teacherSlice = createSlice({
  name: 'teachers',
  initialState: { list: [], pagination: {}, loading: false, error: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchTeachers.pending,   (s) => { s.loading = true; })
     .addCase(fetchTeachers.fulfilled, (s, a) => { s.loading = false; s.list = a.payload.teachers || []; s.pagination = a.payload.pagination || {}; })
     .addCase(fetchTeachers.rejected,  (s, a) => { s.loading = false; s.error = a.payload; });
  },
});
export default teacherSlice.reducer;
