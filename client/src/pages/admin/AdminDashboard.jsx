import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { Spinner } from "../../components/common/Spinner";
import { Badge } from "../../components/common/Badge";
import { toast } from "react-hot-toast";
import { ShieldAlert, Users, Swords, Activity, Hammer, Landmark } from "lucide-react";
import { PaymentVerification } from "../../components/admin/PaymentVerification";
import { AdminAnnouncements } from "../../components/admin/AdminAnnouncements";
import { MatchSettlements } from "../../components/admin/MatchSettlements";

export const AdminDashboard = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [userSearch, setUserSearch] = useState("");
  const [usersPage, setUsersPage] = useState(1);
  const [matchesPage, setMatchesPage] = useState(1);
  const [logsPage, setLogsPage] = useState(1);

  // Form states for maintenance mode
  const [maintEnabled, setMaintEnabled] = useState(false);
  const [maintTitle, setMaintTitle] = useState("Scheduled Maintenance");
  const [maintDesc, setMaintDesc] = useState(
    "The platform is undergoing quick maintenance checks. Please check back shortly.",
  );
  const [isUpdatingMaintenance, setIsUpdatingMaintenance] = useState(false);

  // Queries
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["adminStats"],
    queryFn: async () => {
      const res = await api.get("/admin/dashboard");
      // Set local state when fetched
      setMaintEnabled(res.data.data.maintenanceMode);
      return res.data.data;
    },
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["adminUsers", usersPage, userSearch],
    queryFn: async () => {
      const searchParam = userSearch
        ? `&search=${encodeURIComponent(userSearch)}`
        : "";
      const res = await api.get(
        `/admin/users?limit=10&page=${usersPage}${searchParam}`,
      );
      return res.data.data;
    },
  });

  const { data: matchesData, isLoading: matchesLoading } = useQuery({
    queryKey: ["adminMatches", matchesPage],
    queryFn: async () => {
      const res = await api.get(`/admin/matches?limit=10&page=${matchesPage}`);
      return res.data.data;
    },
  });

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ["adminLogs", logsPage],
    queryFn: async () => {
      const res = await api.get(`/admin/logs?limit=20&page=${logsPage}`);
      return res.data.data;
    },
  });

  // Mutations
  const toggleUserMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      await api.put(`/admin/user/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      toast.success("User status updated successfully.");
    },
    onError: (err) => {
      toast.error(
        err.response?.data?.message || "Could not update user status.",
      );
    },
  });

  const handleMaintenanceToggle = async (e) => {
    e.preventDefault();
    setIsUpdatingMaintenance(true);
    try {
      const response = await api.post("/admin/maintenance", {
        enabled: maintEnabled,
        title: maintTitle,
        description: maintDesc,
      });
      if (response.data.success) {
        queryClient.invalidateQueries({ queryKey: ["adminStats"] });
        toast.success(
          `Maintenance mode ${maintEnabled ? "enabled" : "disabled"}`,
        );
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Could not toggle maintenance mode.",
      );
    } finally {
      setIsUpdatingMaintenance(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
          <ShieldAlert size={26} className="text-rose-500" />
          <span>Platform Administration</span>
        </h1>
        <div className="flex gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === "overview"
                ? "bg-rose-600 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === "users"
                ? "bg-rose-600 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab("matches")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === "matches"
                ? "bg-rose-600 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Matches
          </button>
          <button
            onClick={() => setActiveTab("settlements")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === "settlements"
                ? "bg-rose-600 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Settlements
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === "logs"
                ? "bg-rose-600 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Audits
          </button>
          <button
            onClick={() => setActiveTab("payments")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === "payments"
                ? "bg-rose-600 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Payments
          </button>
          <button
            onClick={() => setActiveTab("announcements")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === "announcements"
                ? "bg-rose-600 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Alerts
          </button>
        </div>
      </div>

      {/* Tabs panels */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Stats Widgets */}
          {statsLoading ? (
            <Spinner className="py-8" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="flex items-center justify-between p-6">
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Total Players
                  </span>
                  <span className="text-3xl font-black text-white mt-1 block">
                    {stats?.totalUsers}
                  </span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
                  <Users size={20} />
                </div>
              </Card>

              <Card className="flex items-center justify-between p-6">
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Active Matches
                  </span>
                  <span className="text-3xl font-black text-white mt-1 block">
                    {stats?.activeMatches}
                  </span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                  <Activity size={20} />
                </div>
              </Card>

              <Card className="flex items-center justify-between p-6">
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Completed Matches
                  </span>
                  <span className="text-3xl font-black text-white mt-1 block">
                    {stats?.totalMatches}
                  </span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400">
                  <Swords size={20} />
                </div>
              </Card>

              <Card className="flex items-center justify-between p-6">
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Platform status
                  </span>
                  <span className="text-lg font-black mt-2 block">
                    {stats?.maintenanceMode ? (
                      <span className="text-amber-500">Maintenance</span>
                    ) : (
                      <span className="text-emerald-400">Online</span>
                    )}
                  </span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
                  <Hammer size={20} />
                </div>
              </Card>
            </div>
          )}

          {/* Maintenance Mode Configuration Panel */}
          <Card title="System Maintenance Management">
            <form onSubmit={handleMaintenanceToggle} className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-850 rounded-xl mb-4">
                <div>
                  <span className="block font-bold text-slate-200 text-sm">
                    Lock Platform (Maintenance mode)
                  </span>
                  <p className="text-xs text-slate-500 max-w-sm mt-0.5">
                    When enabled, game matchmaking and gameplay are blocked.
                    Current active matches are safely aborted.
                  </p>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setMaintEnabled(!maintEnabled)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      maintEnabled ? "bg-amber-500" : "bg-slate-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        maintEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {maintEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Notice Title"
                    value={maintTitle}
                    onChange={(e) => setMaintTitle(e.target.value)}
                  />

                  <Input
                    label="Notice Description"
                    value={maintDesc}
                    onChange={(e) => setMaintDesc(e.target.value)}
                  />
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="danger"
                  isLoading={isUpdatingMaintenance}
                >
                  Save Maintenance Config
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {activeTab === "users" && (
        <Card title="Manage Registered Players">
          <div className="space-y-4">
            {/* Search Input bar */}
            <div className="flex gap-2 max-w-sm">
              <Input
                placeholder="Search by username..."
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setUsersPage(1);
                }}
              />
            </div>

            {usersLoading ? (
              <Spinner className="py-8" />
            ) : usersData?.users && usersData.users.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 text-xs font-bold uppercase pb-3">
                      <th className="pb-3 pr-4">Username</th>
                      <th className="pb-3 px-4">Email</th>
                      <th className="pb-3 px-4">Rating</th>
                      <th className="pb-3 px-4">Status</th>
                      <th className="pb-3 pl-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-350">
                    {usersData.users.map((u) => (
                      <tr key={u._id} className="hover:bg-slate-800/10">
                        <td className="py-3.5 pr-4 font-bold text-slate-200">
                          {u.username}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {u.email}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-indigo-400">
                          {u.profile?.statistics?.rating || 1200}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge
                            variant={
                              u.status === "active" ? "success" : "danger"
                            }
                          >
                            {u.status}
                          </Badge>
                        </td>
                        <td className="py-3.5 pl-4 text-right">
                          {u.status === "active" ? (
                            <Button
                              size="sm"
                              variant="danger"
                              className="px-2.5 py-1 text-xs cursor-pointer"
                              onClick={() =>
                                toggleUserMutation.mutate({
                                  id: u._id,
                                  status: "suspended",
                                })
                              }
                            >
                              Suspend
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="px-2.5 py-1 text-xs text-emerald-400 cursor-pointer"
                              onClick={() =>
                                toggleUserMutation.mutate({
                                  id: u._id,
                                  status: "active",
                                })
                              }
                            >
                              Activate
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {usersData.pagination.pages > 1 && (
                  <div className="flex justify-between items-center border-t border-slate-850 pt-4 mt-2">
                    <span className="text-xs text-slate-500">
                      Page {usersData.pagination.page} of{" "}
                      {usersData.pagination.pages}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={usersPage === 1}
                        onClick={() =>
                          setUsersPage((prev) => Math.max(1, prev - 1))
                        }
                      >
                        Previous
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={usersPage >= usersData.pagination.pages}
                        onClick={() =>
                          setUsersPage((prev) =>
                            Math.min(usersData.pagination.pages, prev + 1),
                          )
                        }
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                No players found matching that search.
              </div>
            )}
          </div>
        </Card>
      )}

      {activeTab === "matches" && (
        <Card title="Global Match Registry">
          {matchesLoading ? (
            <Spinner className="py-8" />
          ) : matchesData?.matches && matchesData.matches.length > 0 ? (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 text-xs font-bold uppercase pb-3">
                      <th className="pb-3 pr-4">Player One</th>
                      <th className="pb-3 px-4">Player Two</th>
                      <th className="pb-3 px-4">Outcome</th>
                      <th className="pb-3 px-4">Status</th>
                      <th className="pb-3 pl-4">Played Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-350">
                    {matchesData.matches.map((m) => (
                      <tr key={m._id} className="hover:bg-slate-800/10">
                        <td className="py-3.5 pr-4 text-slate-300 font-medium">
                          {m.playerOne?.username || "Unknown"}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 font-medium">
                          {m.playerTwo?.username || "Unknown"}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {m.winner ? (
                            <span className="text-indigo-400 font-bold">
                              Win:{" "}
                              {m.winner === m.playerOne?._id
                                ? m.playerOne?.username
                                : m.playerTwo?.username}
                            </span>
                          ) : (
                            <span>{m.result || "Draw"}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge
                            variant={
                              m.status === "finished" ? "success" : "neutral"
                            }
                          >
                            {m.status}
                          </Badge>
                        </td>
                        <td className="py-3.5 pl-4 text-xs text-slate-500">
                          {new Date(m.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {matchesData.pagination.pages > 1 && (
                <div className="flex justify-between items-center border-t border-slate-850 pt-4 mt-2">
                  <span className="text-xs text-slate-500">
                    Page {matchesData.pagination.page} of{" "}
                    {matchesData.pagination.pages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={matchesPage === 1}
                      onClick={() =>
                        setMatchesPage((prev) => Math.max(1, prev - 1))
                      }
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={matchesPage >= matchesData.pagination.pages}
                      onClick={() =>
                        setMatchesPage((prev) =>
                          Math.min(matchesData.pagination.pages, prev + 1),
                        )
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              No match records exist.
            </div>
          )}
        </Card>
      )}

      {activeTab === "logs" && (
        <Card title="Security & Admin Audit Logs">
          {logsLoading ? (
            <Spinner className="py-8" />
          ) : logsData?.logs && logsData.logs.length > 0 ? (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase pb-3">
                      <th className="pb-3 pr-4">Timestamp</th>
                      <th className="pb-3 px-4">User</th>
                      <th className="pb-3 px-4">Role</th>
                      <th className="pb-3 px-4">Action</th>
                      <th className="pb-3 pl-4">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-400 font-mono">
                    {logsData.logs.map((log) => (
                      <tr key={log._id} className="hover:bg-slate-800/10">
                        <td className="py-2.5 pr-4 text-slate-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-300">
                          {log.user?.username || "System"}
                        </td>
                        <td className="py-2.5 px-4">
                          <Badge
                            variant={
                              log.role === "admin" ? "danger" : "neutral"
                            }
                          >
                            {log.role}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-4 text-slate-200 font-semibold">
                          {log.action}
                        </td>
                        <td className="py-2.5 pl-4 text-slate-500">
                          {log.ip || "127.0.0.1"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {logsData.pagination.pages > 1 && (
                <div className="flex justify-between items-center border-t border-slate-850 pt-4 mt-2">
                  <span className="text-xs text-slate-500">
                    Page {logsData.pagination.page} of{" "}
                    {logsData.pagination.pages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={logsPage === 1}
                      onClick={() =>
                        setLogsPage((prev) => Math.max(1, prev - 1))
                      }
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={logsPage >= logsData.pagination.pages}
                      onClick={() =>
                        setLogsPage((prev) =>
                          Math.min(logsData.pagination.pages, prev + 1),
                        )
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              No audit log records exist.
            </div>
          )}
        </Card>
      )}

      {activeTab === "payments" && <PaymentVerification />}
      
      {activeTab === "settlements" && <MatchSettlements />}
      
      {activeTab === "announcements" && <AdminAnnouncements />}
    </div>
  );
};

export default AdminDashboard;
