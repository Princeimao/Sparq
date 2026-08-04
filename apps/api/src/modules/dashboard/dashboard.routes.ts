import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../../config/prisma";
import { authenticate } from "../../middleware/auth";
import { ApiResponse } from "../../middleware/responseHandler";

const router = Router();

router.get(
  ["/stats", "/dashboard/stats"],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId as string;

      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - 6);
      startOfWeek.setHours(0, 0, 0, 0);

      const [
        orders,
        customersCount,
        messagesCount,
        productsCount,
        appointmentsCount,
        activeWorkflowsCount,
        integrationsCount,
      ] = await Promise.all([
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
      const paidOrders = orders.filter(
        (o) => o.status === "PAID" || o.status === "COMPLETED"
      );
      const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.amount || 0), 0);

      const purchaseOrdersCount = orders.filter((o) => o.status === "PENDING").length;
      const weeklyRevenue = paidOrders
        .filter((o) => o.createdAt >= startOfWeek)
        .reduce((sum, o) => sum + (o.amount || 0), 0);

      // Calculated Expenses (28% of total revenue + operational overhead)
      const expenseAmount = totalRevenue > 0 ? totalRevenue * 0.28 + 150 : 85;
      const profitAmount = totalRevenue - expenseAmount;

      // Conversion Rate: ratio of paid orders to total leads/customers
      const conversionRate = customersCount > 0
        ? Number(((paidOrders.length / customersCount) * 100).toFixed(1))
        : totalSales > 0
          ? 100
          : 0;

      // Weekly sales data (Last 7 days)
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

      // Monthly sales breakdown (Last 12 months)
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthlySales = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

        const monthOrders = orders.filter(
          (o) => o.createdAt >= monthStart && o.createdAt <= monthEnd
        );
        const monthEarning = monthOrders
          .filter((o) => o.status === "PAID" || o.status === "COMPLETED")
          .reduce((sum, o) => sum + (o.amount || 0), 0);
        const monthExpense = monthEarning > 0 ? monthEarning * 0.28 : 0;
        const monthProfit = monthEarning - monthExpense;

        monthlySales.push({
          month: monthNames[d.getMonth()],
          earning: Math.round(monthEarning),
          expense: Math.round(monthExpense),
          profit: Math.round(monthProfit),
          orders: monthOrders.length,
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

      res.status(200).json(
        new ApiResponse(
          {
            metrics: {
              totalSales,
              totalRevenue,
              weeklyRevenue,
              purchaseOrdersCount,
              expenseAmount,
              profitAmount,
              conversionRate,
              customersCount,
              messagesCount,
              productsCount,
              appointmentsCount,
              activeWorkflowsCount,
              integrationsCount,
            },
            weeklySales,
            monthlySales,
            orderStatus,
            topProducts,
            recentOrders,
            recentCustomers,
            upcomingAppointments,
            workflows,
          },
          "Dashboard data fetched successfully",
          true
        )
      );
    } catch (error) {
      next(error);
    }
  }
);

export default router;
