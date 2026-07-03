import { createSlice } from '@reduxjs/toolkit';
const examSlice = createSlice({
  name: 'exams',
  initialState: { list: [], results: [], loading: false },
  reducers: {
    setExams:   (s, a) => { s.list = a.payload; },
    setResults: (s, a) => { s.results = a.payload; },
    setLoading: (s, a) => { s.loading = a.payload; },
  },
});
export const { setExams, setResults, setLoading } = examSlice.actions;
export default examSlice.reducer;
