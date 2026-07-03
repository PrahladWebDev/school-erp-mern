import { createSlice } from '@reduxjs/toolkit';
const attendanceSlice = createSlice({
  name: 'attendance',
  initialState: { todaySummary: null, monthlyReport: null, loading: false },
  reducers: {
    setTodaySummary:  (s, a) => { s.todaySummary = a.payload; },
    setMonthlyReport: (s, a) => { s.monthlyReport = a.payload; },
    setLoading:       (s, a) => { s.loading = a.payload; },
  },
});
export const { setTodaySummary, setMonthlyReport, setLoading } = attendanceSlice.actions;
export default attendanceSlice.reducer;
