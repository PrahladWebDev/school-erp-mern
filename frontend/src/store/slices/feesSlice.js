import { createSlice } from '@reduxjs/toolkit';
const feesSlice = createSlice({
  name: 'fees',
  initialState: { structures: [], pending: [], loading: false },
  reducers: {
    setStructures: (s, a) => { s.structures = a.payload; },
    setPending:    (s, a) => { s.pending = a.payload; },
    setLoading:    (s, a) => { s.loading = a.payload; },
  },
});
export const { setStructures, setPending, setLoading } = feesSlice.actions;
export default feesSlice.reducer;
