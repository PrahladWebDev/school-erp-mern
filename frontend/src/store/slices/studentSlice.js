import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { studentAPI } from '../../api';
export const fetchStudents = createAsyncThunk('students/fetchAll', async (params, { rejectWithValue }) => {
  try { const { data } = await studentAPI.getAll(params); return data.data; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});
export const fetchStudentById = createAsyncThunk('students/fetchById', async (id, { rejectWithValue }) => {
  try { const { data } = await studentAPI.getById(id); return data.data.student; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});
const studentSlice = createSlice({
  name: 'students',
  initialState: { list: [], selected: null, pagination: {}, loading: false, error: null },
  reducers: { clearSelected: (s) => { s.selected = null; } },
  extraReducers: (b) => {
    b.addCase(fetchStudents.pending,   (s) => { s.loading = true; s.error = null; })
     .addCase(fetchStudents.fulfilled, (s, a) => { s.loading = false; s.list = a.payload.students || []; s.pagination = a.payload.pagination || {}; })
     .addCase(fetchStudents.rejected,  (s, a) => { s.loading = false; s.error = a.payload; })
     .addCase(fetchStudentById.pending,   (s) => { s.loading = true; })
     .addCase(fetchStudentById.fulfilled, (s, a) => { s.loading = false; s.selected = a.payload; })
     .addCase(fetchStudentById.rejected,  (s, a) => { s.loading = false; s.error = a.payload; });
  },
});
export const { clearSelected } = studentSlice.actions;
export default studentSlice.reducer;
