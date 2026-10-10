import { api } from "./api";

// ─── Staff + resources domain clients ─────────────────────────────────────────

interface ApiEnvelope<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  specialty: string | null;
  image: string | null;
  color: string | null;
  isActive: boolean;
  services?: { id: string; name: string }[];
  availability?: WeeklyHours[];
  _count?: { allocations: number };
}

export interface SpaceResource {
  id: string;
  name: string;
  kind: "TABLE" | "ROOM" | "EQUIPMENT" | "OTHER";
  description: string | null;
  image: string | null;
  color: string | null;
  capacity: number | null;
  isActive: boolean;
  locationMode: string | null;
  serviceLinks?: { service: { id: string; name: string } }[];
  availability?: WeeklyHours[];
  _count?: { allocations: number };
}

export interface WeeklyHours {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface StaffDetail extends StaffMember {
  availability: WeeklyHours[];
  timeOffs: TimeOff[];
  breaks: Break[];
}

export interface Break {
  id: string;
  staffId: string | null;
  resourceId: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  label: string | null;
}

export async function getStaff(id: string): Promise<{
  staff: StaffDetail;
  upcomingBookings: {
    id: string;
    customerName: string;
    startTime: string;
    endTime: string;
    status: string;
    service: { id: string; name: string; duration: number } | null;
    customer: { id: string; name: string | null; phone: string } | null;
  }[];
  pastBookings: number;
}> {
  const res = await api.get<
    ApiEnvelope<{
      staff: StaffDetail;
      upcomingBookings: {
        id: string;
        customerName: string;
        startTime: string;
        endTime: string;
        status: string;
        service: { id: string; name: string; duration: number } | null;
        customer: { id: string; name: string | null; phone: string } | null;
      }[];
      pastBookings: number;
    }>
  >(`/staff/${id}`);
  return res.data.data;
}

export interface TimeOff {
  id: string;
  staffId: string | null;
  resourceId: string | null;
  startDate: string;
  endDate: string;
  reason: string | null;
  staff?: { id: string; name: string } | null;
  resource?: { id: string; name: string } | null;
}

export async function listStaff(active?: boolean): Promise<StaffMember[]> {
  const res = await api.get<ApiEnvelope<{ staff: StaffMember[] }>>("/staff", {
    params: active == null ? {} : { active },
  });
  return res.data.data.staff;
}

export async function createStaff(input: Record<string, unknown>): Promise<StaffMember> {
  const res = await api.post<ApiEnvelope<{ staff: StaffMember }>>("/staff", input);
  return res.data.data.staff;
}

export async function updateStaff(id: string, input: Record<string, unknown>): Promise<StaffMember> {
  const res = await api.patch<ApiEnvelope<{ staff: StaffMember }>>(`/staff/${id}`, input);
  return res.data.data.staff;
}

export async function deleteStaff(id: string): Promise<{ archived?: boolean }> {
  const res = await api.delete<ApiEnvelope<{ archived?: boolean }>>(`/staff/${id}`);
  return res.data.data ?? {};
}

export async function listResources(kind?: string): Promise<SpaceResource[]> {
  const res = await api.get<ApiEnvelope<{ resources: SpaceResource[] }>>("/resources", {
    params: kind ? { kind } : {},
  });
  return res.data.data.resources;
}

export async function createResource(input: Record<string, unknown>): Promise<SpaceResource> {
  const res = await api.post<ApiEnvelope<{ resource: SpaceResource }>>("/resources", input);
  return res.data.data.resource;
}

export async function updateResource(id: string, input: Record<string, unknown>): Promise<SpaceResource> {
  const res = await api.patch<ApiEnvelope<{ resource: SpaceResource }>>(`/resources/${id}`, input);
  return res.data.data.resource;
}

export async function deleteResource(id: string): Promise<{ archived?: boolean }> {
  const res = await api.delete<ApiEnvelope<{ archived?: boolean }>>(`/resources/${id}`);
  return res.data.data ?? {};
}

export async function getHours(scope: { staffId?: string; resourceId?: string }): Promise<WeeklyHours[]> {
  const res = await api.get<ApiEnvelope<{ hours: WeeklyHours[] }>>("/availability/hours", {
    params: scope,
  });
  return res.data.data.hours;
}

export async function setHours(
  scope: { staffId?: string; resourceId?: string },
  hours: WeeklyHours[],
): Promise<WeeklyHours[]> {
  const res = await api.put<ApiEnvelope<{ hours: WeeklyHours[] }>>("/availability/hours", {
    ...scope,
    hours,
  });
  return res.data.data.hours;
}

export async function listTimeOff(scope?: {
  staffId?: string;
  resourceId?: string;
}): Promise<TimeOff[]> {
  const res = await api.get<ApiEnvelope<{ timeOff: TimeOff[] }>>("/availability/time-off", {
    params: scope ?? {},
  });
  return res.data.data.timeOff;
}

export async function addTimeOff(input: {
  staffId?: string;
  resourceId?: string;
  startDate: string;
  endDate: string;
  reason?: string;
}): Promise<TimeOff> {
  const res = await api.post<ApiEnvelope<{ timeOff: TimeOff }>>("/availability/time-off", input);
  return res.data.data.timeOff;
}

export async function removeTimeOff(id: string): Promise<void> {
  await api.delete(`/availability/time-off/${id}`);
}

export async function getBreaks(scope: {
  staffId?: string;
  resourceId?: string;
}): Promise<Break[]> {
  const res = await api.get<ApiEnvelope<{ breaks: Break[] }>>("/availability/breaks", {
    params: scope,
  });
  return res.data.data.breaks;
}

export async function setBreaks(
  scope: { staffId?: string; resourceId?: string },
  breaks: { dayOfWeek: number; startTime: string; endTime: string; label?: string }[],
): Promise<Break[]> {
  const res = await api.put<ApiEnvelope<{ breaks: Break[] }>>("/availability/breaks", {
    ...scope,
    breaks,
  });
  return res.data.data.breaks;
}
