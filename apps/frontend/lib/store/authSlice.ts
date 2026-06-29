import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { api } from "../api";

export interface Organization {
  id: string;
  name: string;
  role: string;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface AuthState {
  user: User | null;
  organizations: Organization[];
  currentOrganizationId: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
}

const getInitialTokens = () => {
  if (typeof window !== "undefined") {
    const accessToken = localStorage.getItem("accessToken");
    const refreshToken = localStorage.getItem("refreshToken");
    return { accessToken, refreshToken };
  }
  return { accessToken: null, refreshToken: null };
};

const initialTokens = getInitialTokens();

const initialState: AuthState = {
  user: null,
  organizations: [],
  currentOrganizationId: null,
  accessToken: initialTokens.accessToken,
  refreshToken: initialTokens.refreshToken,
  isAuthenticated: !!initialTokens.accessToken,
  isLoading: false,
  isInitialized: false,
};

// Async thunk to fetch user info and their organizations
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
    setTokens: (
      state,
      action: PayloadAction<{ accessToken: string; refreshToken: string }>
    ) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;
      if (typeof window !== "undefined") {
        localStorage.setItem("accessToken", action.payload.accessToken);
        localStorage.setItem("refreshToken", action.payload.refreshToken);
        localStorage.setItem("isLoggedIn", "true");
      }
    },
    setCurrentOrganizationId: (state, action: PayloadAction<string | null>) => {
      state.currentOrganizationId = action.payload;
      if (typeof window !== "undefined" && action.payload) {
        localStorage.setItem("currentOrganizationId", action.payload);
      }
    },
    clearAuth: (state) => {
      state.user = null;
      state.organizations = [];
      state.currentOrganizationId = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.isInitialized = true;
      if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("currentOrganizationId");
      }
    },
    setInitialized: (state) => {
      state.isInitialized = true;
    }
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
          
          // Map memberships to organizations
          const orgs: Organization[] = (user.memberships || []).map((m: any) => ({
            id: m.organization.id,
            name: m.organization.name,
            role: m.role,
          }));
          
          state.organizations = orgs;
          
          // Select default organization if none selected or if selected is not part of memberships
          const savedOrgId = typeof window !== "undefined" ? localStorage.getItem("currentOrganizationId") : null;
          const isSavedOrgValid = orgs.some((o) => o.id === savedOrgId);
          
          if (isSavedOrgValid) {
            state.currentOrganizationId = savedOrgId;
          } else if (orgs.length > 0) {
            state.currentOrganizationId = orgs[0].id;
            if (typeof window !== "undefined") {
              localStorage.setItem("currentOrganizationId", orgs[0].id);
            }
          } else {
            state.currentOrganizationId = null;
          }
          state.isAuthenticated = true;
        } else {
          // If no user object is returned, clear authentication
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

export const { setTokens, setCurrentOrganizationId, clearAuth, setInitialized } = authSlice.actions;
export default authSlice.reducer;
