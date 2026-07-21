import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../../config/prisma";
import { authenticate } from "../../middleware/auth";
import { ApiResponse } from "../../middleware/responseHandler";

const router = Router();

router.get(
  "/dashboard/stats",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId as string;

      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - 6);
      startOfWeek.setHours(0, 0, 0, 0);

      const [orders, customersCount, messagesCount, productsCount, appointmentsCount, activeWorkflowsCount, integrationsCount,] = await Promise.all([
        prisma.order.findMany({
          where: { userId },
        }),

        prisma.customer.count({ where: { userId } }),

        prisma.message.count({
          where: {
            customer: { userId },
          },
        }),

        prisma.product.count({ where: { userId } }),
        prisma.appointment.count({ where: { userId } }),
        prisma.workflow.count({ where: { userId, isActive: true } }),
        prisma.integration.count({ where: { userId, isActive: true } }),
      ]);

      const totalSales = orders.length;
      const totalRevenue = orders
        .filter((o) => o.status === "PAID" || o.status === "COMPLETED")
        .reduce((sum, o) => sum + (o.amount || 0), 0);

      const paidOrders = orders.filter((o) => o.status === "PAID" || o.status === "COMPLETED");
      const purchaseOrdersCount = orders.filter((o) => o.status === "PENDING").length;
      const weeklyRevenue = paidOrders
        .filter((o) => o.createdAt >= startOfWeek)
        .reduce((sum, o) => sum + (o.amount || 0), 0);

      // 3. Calculated Expenses (e.g. 28% of revenue + base infrastructure costs)
      const expenseAmount = totalRevenue > 0 ? totalRevenue * 0.28 + 150 : 85;

      // 4. Weekly sales data (Last 7 days)
      const weeklySales = [];
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const startOfDay = new Date(date.setHours(0, 0, 0, 0));
        const endOfDay = new Date(date.setHours(23, 59, 59, 999));

        const dayOrders = orders.filter(
          (o) => o.createdAt >= startOfDay && o.createdAt <= endOfDay
        );
        const dayRevenue = dayOrders
          .filter((o) => o.status === "PAID" || o.status === "COMPLETED")
          .reduce((sum, o) => sum + (o.amount || 0), 0);

        weeklySales.push({
          day: dayNames[startOfDay.getDay()],
          revenue: dayRevenue,
          orders: dayOrders.length,
          date: startOfDay.toISOString().split("T")[0],
        });
      }

      const orderStatus = ["PENDING", "PAID", "COMPLETED", "CANCELLED"].map((status) => ({
        status,
        count: orders.filter((order) => order.status === status).length,
        amount: orders
          .filter((order) => order.status === status)
          .reduce((sum, order) => sum + (order.amount || 0), 0),
      }));

      const productMap = new Map<string, { name: string; orders: number; revenue: number }>();
      orders.forEach((order) => {
        const current = productMap.get(order.productName) || {
          name: order.productName,
          orders: 0,
          revenue: 0,
        };
        current.orders += 1;
        current.revenue += order.amount || 0;
        productMap.set(order.productName, current);
      });

      const topProducts = Array.from(productMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      const [recentOrders, recentCustomers, upcomingAppointments, workflows] =
        await Promise.all([
          prisma.order.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 5,
            include: {
              customer: {
                select: {
                  name: true,
                  phone: true,
                },
              },
            },
          }),
          prisma.customer.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 5,
          }),
          prisma.appointment.findMany({
            where: {
              userId,
              startTime: { gte: now },
            },
            orderBy: { startTime: "asc" },
            take: 5,
          }),
          prisma.workflow.findMany({
            where: { userId },
            orderBy: { updatedAt: "desc" },
            take: 5,
          }),
        ]);

      res.status(200).json(new ApiResponse({
        metrics: {
          totalSales,
          totalRevenue,
          weeklyRevenue,
          purchaseOrdersCount,
          expenseAmount,
          customersCount,
          messagesCount,
          productsCount,
          appointmentsCount,
          activeWorkflowsCount,
          integrationsCount,
        },
        weeklySales,
        orderStatus,
        topProducts,
        recentOrders,
        recentCustomers,
        upcomingAppointments,
        workflows,
      }, "Dashboard data fetched successfully", true))
    } catch (error) {
      next(error);
    }
  }
);

export default router;
