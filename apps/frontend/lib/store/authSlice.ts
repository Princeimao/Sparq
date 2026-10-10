import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "../api";

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
}

// NOTE: tokens are httpOnly cookies managed by the backend. Nothing
// auth-related is kept in localStorage — the store only tracks the user
// profile and whether a session exists.

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
};

export const fetchCurrentUser = createAsyncThunk(
  "auth/fetchCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/auth/me");
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch user data"
      );
    }
  }
);

export const logoutUser = createAsyncThunk(
  "auth/logoutUser",
  async (_, { dispatch }) => {
    try {
      await api.post("/auth/logout");
    } catch (e) {
      console.error("Logout request failed", e);
    } finally {
      dispatch(clearAuth());
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearAuth: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isInitialized = true;
    },
    setInitialized: (state) => {
      state.isInitialized = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        const { user } = action.payload;
        if (user) {
          state.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            avatarUrl: user.avatarUrl,
          };
          state.isAuthenticated = true;
        } else {
          authSlice.caseReducers.clearAuth(state);
        }
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.isLoading = false;
        state.isInitialized = true;
        authSlice.caseReducers.clearAuth(state);
      });
  },
});

export const { clearAuth, setInitialized } = authSlice.actions;
export default authSlice.reducer;
