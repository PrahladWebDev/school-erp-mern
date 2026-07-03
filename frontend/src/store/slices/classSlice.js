import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { classAPI } from '../../api';
export const fetchClasses = createAsyncThunk('classes/fetchAll', async (params, { rejectWithValue }) => {
  try { const { data } = await classAPI.getAll(params); return data.data.classes; }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed'); }
});
const classSlice = createSlice({
  name: 'classes',
  initialState: { list: [], loading: false, error: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchClasses.pending,   (s) => { s.loading = true; })
     .addCase(fetchClasses.fulfilled, (s, a) => { s.loading = false; s.list = a.payload || []; })
     .addCase(fetchClasses.rejected,  (s, a) => { s.loading = false; s.error = a.payload; });
  },
});
export default classSlice.reducer;
