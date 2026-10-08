import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import { Button } from "../common/Button";
import { Badge } from "../common/Badge";
import { toast } from "react-hot-toast";
import { Trash2, Plus, Power } from "lucide-react";

export const PaymentVerification = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState(""); 
  const [selectedProof, setSelectedProof] = useState(null); 
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingId, setRejectingId] = useState(null);

  const [upiList, setUpiList] = useState([]);
  const [newUpi, setNewUpi] = useState("");

  const [activeTab, setActiveTab] = useState("recharges");
  const [wPage, setWPage] = useState(1);
  const [wFilterStatus, setWFilterStatus] = useState("");
  const [selectedQr, setSelectedQr] = useState(null);
  const [wRejectingId, setWRejectingId] = useState(null);
  const [wRejectReason, setWRejectReason] = useState("");

  const handleViewScreenshot = async (filename) => {
    try {
      setIsImageLoading(true);
      const response = await api.get(`/admin/payment-proof/${filename}`, {
        responseType: 'blob'
      });
      const objectUrl = URL.createObjectURL(response.data);
      setSelectedProof(objectUrl);
    } catch (err) {
      toast.error("Unable to load payment screenshot.");
    } finally {
      setIsImageLoading(false);
    }
  };

  const handleCloseScreenshot = () => {
    if (selectedProof) {
      URL.revokeObjectURL(selectedProof);
    }
    setSelectedProof(null);
  };

  const { data, isLoading } = useQuery({
    queryKey: ["adminRecharges", page, filterStatus],
    queryFn: async () => {
      const statusParam = filterStatus ? `&status=${filterStatus}` : "";
      const res = await api.get(`/admin/recharges?limit=10&page=${page}${statusParam}`);
      return res.data;
    },
  });

  const { data: upiSettings, isLoading: upiLoading } = useQuery({
    queryKey: ["adminUpiSettings"],
    queryFn: async () => {
      const res = await api.get(`/admin/settings/upi`);
      return res.data.data;
    },
  });

  useEffect(() => {
    if (upiSettings?.upiIds) {
      setUpiList(upiSettings.upiIds);
    }
  }, [upiSettings]);

  const updateUpiMutation = useMutation({
    mutationFn: async (upiIds) => {
      const res = await api.put("/admin/settings/upi", { upiIds });
      return res.data;
    },
    onSuccess: () => {
      toast.success("UPI settings updated successfully");
      queryClient.invalidateQueries({ queryKey: ["adminUpiSettings"] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to update UPI settings");
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id) => {
      await api.put(`/admin/recharges/${id}/approve`);
    },
    onSuccess: () => {
      toast.success("Recharge approved successfully");
      queryClient.invalidateQueries({ queryKey: ["adminRecharges"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to approve recharge");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }) => {
      await api.put(`/admin/recharges/${id}/reject`, { reason });
    },
    onSuccess: () => {
      toast.success("Recharge rejected");
      setRejectingId(null);
      setRejectReason("");
      queryClient.invalidateQueries({ queryKey: ["adminRecharges"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to reject recharge");
    },
  });

  const handleAddUpi = () => {
    if (!newUpi.trim()) return;
    if (upiList.length >= 5) {
      toast.error("Maximum 5 UPI IDs allowed");
      return;
    }
    const newList = [...upiList, { upi: newUpi.trim(), isActive: true }];
    setUpiList(newList);
    updateUpiMutation.mutate(newList);
    setNewUpi("");
  };

  const handleRemoveUpi = (index) => {
    const newList = upiList.filter((_, i) => i !== index);
    setUpiList(newList);
    updateUpiMutation.mutate(newList);
  };

  const handleToggleUpi = (index) => {
    const newList = [...upiList];
    newList[index].isActive = !newList[index].isActive;
    setUpiList(newList);
    updateUpiMutation.mutate(newList);
  };

  const recharges = data?.data || [];
  const pagination = data?.pagination || { page: 1, pages: 1 };

  const { data: statsData } = useQuery({
    queryKey: ["adminStats"],
    queryFn: async () => {
      const res = await api.get("/admin/dashboard");
      return res.data.data;
    },
  });

  const { data: wData, isLoading: wLoading } = useQuery({
    queryKey: ["adminWithdrawals", wPage, wFilterStatus],
    queryFn: async () => {
      const statusParam = wFilterStatus ? `&status=${wFilterStatus}` : "";
      const res = await api.get(`/admin/withdrawals?limit=10&page=${wPage}${statusParam}`);
      return res.data;
    },
  });

  const withdrawals = wData?.data || [];
  const wPagination = wData?.pagination || { page: 1, pages: 1 };

  const approveWithdrawalMutation = useMutation({
    mutationFn: async (id) => {
      await api.put(`/admin/withdrawals/${id}/approve`);
    },
    onSuccess: () => {
      toast.success("Withdrawal marked as PAID");
      queryClient.invalidateQueries({ queryKey: ["adminWithdrawals"] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to approve withdrawal");
    },
  });

  const rejectWithdrawalMutation = useMutation({
    mutationFn: async ({ id, reason }) => {
      await api.put(`/admin/withdrawals/${id}/reject`, { reason });
    },
    onSuccess: () => {
      toast.success("Withdrawal rejected and refunded");
      setWRejectingId(null);
      setWRejectReason("");
      queryClient.invalidateQueries({ queryKey: ["adminWithdrawals"] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to reject withdrawal");
    },
  });

  const handleShowQr = (req) => {
    if (!req.upiId || req.upiId.trim() === '' || req.upiId.includes(' ')) {
      toast.error("Invalid withdrawal UPI ID.");
      return;
    }
    setSelectedQr({ upiId: req.upiId.trim(), amount: req.amount, user: req.userInfo?.username });
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-center">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Total Credited</span>
          <span className="text-2xl font-black text-emerald-400">₹{statsData?.totalCreditedAmount || 0}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-center">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Pending Review</span>
          <span className="text-2xl font-black text-amber-400">{statsData?.pendingVerification || 0}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-center">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Approved</span>
          <span className="text-2xl font-black text-indigo-400">{statsData?.approvedRecharges || 0}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-center">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Rejected/Expired</span>
          <span className="text-2xl font-black text-rose-400">{(statsData?.rejectedRecharges || 0) + (statsData?.expiredRecharges || 0)}</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* UPI Settings Panel */}
        <div className="w-full lg:w-1/3 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-slate-200 mb-4">Payment Configuration</h3>
          {upiLoading ? (
            <p className="text-sm text-slate-400">Loading...</p>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  value={newUpi}
                  onChange={(e) => setNewUpi(e.target.value)}
                  placeholder="Enter new UPI ID"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 focus:border-indigo-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddUpi()}
                />
                <Button onClick={handleAddUpi} disabled={!newUpi.trim() || upiList.length >= 5 || updateUpiMutation.isPending} className="px-3">
                  <Plus size={20} />
                </Button>
              </div>
              <p className="text-[10px] text-slate-500">
                You can add up to 5 UPI IDs. The system will randomly assign one active UPI ID per recharge request.
              </p>

              <div className="mt-4 space-y-2">
                {upiList.map((upiObj, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-lg">
                    <div className="flex flex-col">
                      <span className="text-sm font-mono text-slate-200">{upiObj.upi}</span>
                      <span className={`text-[10px] font-bold uppercase mt-1 ${upiObj.isActive ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {upiObj.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleUpi(idx)}
                        className={`p-1.5 rounded-md transition-colors ${upiObj.isActive ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                        title="Toggle Active Status"
                      >
                        <Power size={14} />
                      </button>
                      <button
                        onClick={() => handleRemoveUpi(idx)}
                        className="p-1.5 bg-rose-500/10 text-rose-400 rounded-md hover:bg-rose-500/20 transition-colors"
                        title="Remove UPI"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {upiList.length === 0 && (
                  <div className="text-center py-4 text-xs text-rose-400 border border-dashed border-rose-500/30 rounded-lg bg-rose-500/5">
                    No UPI IDs configured. Users cannot recharge.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Panel */}
        <div className="w-full lg:w-2/3 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="flex border-b border-slate-800 bg-slate-950">
            <button
              className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'recharges' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/5' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}`}
              onClick={() => setActiveTab('recharges')}
            >
              Recharge Requests
            </button>
            <button
              className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'withdrawals' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/5' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}`}
              onClick={() => setActiveTab('withdrawals')}
            >
              Withdrawal Requests
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'recharges' ? (
              <>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <h3 className="text-lg font-bold text-slate-200">Manage Recharges</h3>
                  <select
                    value={filterStatus}
                    onChange={(e) => {
                      setFilterStatus(e.target.value);
                      setPage(1);
                    }}
                    className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-slate-200 min-w-[150px]"
                  >
                    <option value="">All Statuses</option>
                    <option value="PROOF_SUBMITTED">Proof Submitted (Pending)</option>
                    <option value="UNDER_REVIEW">Under Review</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="PENDING_PAYMENT">Pending Payment</option>
                  </select>
                </div>

                {isLoading ? (
                  <div className="text-center py-8 text-slate-500">Loading requests...</div>
                ) : recharges.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-sm border border-dashed border-slate-800 rounded-xl bg-slate-950/50">
                    No recharge requests found matching the current filter.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recharges.map((req) => (
                      <div key={req._id} className="border border-slate-800 rounded-xl p-4 bg-slate-950/50">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                                {req.requestId}
                              </span>
                              <Badge
                                variant={
                                  req.status === "APPROVED"
                                    ? "success"
                                    : req.status === "REJECTED" || req.status === "EXPIRED"
                                    ? "danger"
                                    : req.status === "PROOF_SUBMITTED" || req.status === "UNDER_REVIEW"
                                    ? "warning"
                                    : "neutral"
                                }
                              >
                                {req.status}
                              </Badge>
                            </div>
                            <div className="text-sm font-semibold text-slate-200">
                              {req.user?.username || "Unknown User"} <span className="text-slate-500 font-normal">({req.user?.email})</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-black text-indigo-400">₹{req.amount}</div>
                            <div className="text-[10px] text-slate-500 mt-1">
                              {new Date(req.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-sm mt-4 p-3 bg-slate-900 rounded-lg border border-slate-800">
                          <div>
                            <span className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">Assigned UPI</span>
                            <span className="font-mono text-slate-300 text-xs">{req.assignedUpiId || "Legacy Request"}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">UTR / Txn ID</span>
                            <span className="font-mono text-slate-300">{req.utr || "N/A"}</span>
                          </div>
                          <div className="text-right">
                            <span className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">Payment Proof</span>
                            {req.screenshot ? (
                              <button
                                onClick={() => handleViewScreenshot(req.screenshot)}
                                disabled={isImageLoading}
                                className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold underline disabled:opacity-50"
                              >
                                {isImageLoading ? "Loading..." : "View Screenshot"}
                              </button>
                            ) : (
                              <span className="text-slate-500 text-xs">Not uploaded</span>
                            )}
                          </div>
                        </div>

                        {req.status === "REJECTED" && req.rejectionReason && (
                          <div className="mt-3 text-xs text-rose-400 bg-rose-500/10 p-2 rounded">
                            <strong>Rejection Reason:</strong> {req.rejectionReason}
                          </div>
                        )}

                        {(req.status === "PROOF_SUBMITTED" || req.status === "UNDER_REVIEW") && (
                          <div className="mt-4 flex gap-2 justify-end">
                            {rejectingId === req._id ? (
                               <div className="flex-1 flex gap-2 w-full">
                                 <input
                                   type="text"
                                   placeholder="Reason for rejection..."
                                   className="flex-1 bg-slate-950 border border-rose-500/30 rounded p-2 text-xs text-slate-200"
                                   value={rejectReason}
                                   onChange={(e) => setRejectReason(e.target.value)}
                                 />
                                 <Button
                                   size="sm"
                                   className="bg-rose-600 hover:bg-rose-500 shrink-0"
                                   onClick={() => rejectMutation.mutate({ id: req._id, reason: rejectReason })}
                                   isLoading={rejectMutation.isPending}
                                   disabled={!rejectReason.trim()}
                                 >
                                   Confirm Reject
                                 </Button>
                                 <Button size="sm" variant="secondary" onClick={() => setRejectingId(null)}>
                                   Cancel
                                 </Button>
                               </div>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30"
                                  onClick={() => setRejectingId(req._id)}
                                >
                                  Reject
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white border-none shadow-lg shadow-emerald-500/20"
                                  onClick={() => approveMutation.mutate(req._id)}
                                  isLoading={approveMutation.isPending}
                                >
                                  Approve & Credit Wallet
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {pagination.pages > 1 && (
                      <div className="flex justify-center items-center gap-4 mt-6 pt-4 border-t border-slate-800">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={page === 1}
                          onClick={() => setPage(page - 1)}
                        >
                          Prev
                        </Button>
                        <span className="text-sm font-semibold text-slate-400">
                          Page {page} of {pagination.pages}
                        </span>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={page === pagination.pages}
                          onClick={() => setPage(page + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <h3 className="text-lg font-bold text-slate-200">Manage Withdrawals</h3>
                  <select
                    value={wFilterStatus}
                    onChange={(e) => {
                      setWFilterStatus(e.target.value);
                      setWPage(1);
                    }}
                    className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-slate-200 min-w-[150px]"
                  >
                    <option value="">All Statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="PAID">Paid</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>

                {wLoading ? (
                  <div className="text-center py-8 text-slate-500">Loading requests...</div>
                ) : withdrawals.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-sm border border-dashed border-slate-800 rounded-xl bg-slate-950/50">
                    No withdrawal requests found matching the current filter.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {withdrawals.map((req) => (
                      <div key={req._id} className="border border-slate-800 rounded-xl p-4 bg-slate-950/50">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                                {req.requestId}
                              </span>
                              <Badge
                                variant={
                                  req.status === "PAID"
                                    ? "success"
                                    : req.status === "REJECTED"
                                    ? "danger"
                                    : "warning"
                                }
                              >
                                {req.status}
                              </Badge>
                            </div>
                            <div className="text-sm font-semibold text-slate-200">
                              {req.userInfo?.username || "Unknown User"}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-black text-rose-400">₹{req.amount}</div>
                            <div className="text-[10px] text-slate-500 mt-1">
                              {new Date(req.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm mt-4 p-3 bg-slate-900 rounded-lg border border-slate-800">
                          <div>
                            <span className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">Total Recharged</span>
                            <span className="font-mono text-emerald-400 text-sm">₹{req.totalRecharged || 0}</span>
                          </div>
                          <div className="text-right">
                            <span className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">Total Withdrawn</span>
                            <span className="font-mono text-rose-400 text-sm">₹{req.totalWithdrawn || 0}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-3 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg">
                           <div>
                             <span className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">UPI ID</span>
                             <span className="font-mono text-slate-300 text-sm">{req.upiId}</span>
                           </div>
                           <Button 
                             size="sm" 
                             variant="secondary"
                             onClick={() => handleShowQr(req)}
                           >
                             QR
                           </Button>
                        </div>

                        {req.status === "REJECTED" && req.rejectionReason && (
                          <div className="mt-3 text-xs text-rose-400 bg-rose-500/10 p-2 rounded">
                            <strong>Rejection Reason:</strong> {req.rejectionReason}
                          </div>
                        )}

                        {req.status === "PENDING" && (
                          <div className="mt-4 flex gap-2 justify-end">
                            {wRejectingId === req._id ? (
                               <div className="flex-1 flex gap-2 w-full">
                                 <input
                                   type="text"
                                   placeholder="Reason for rejection (Will refund wallet)..."
                                   className="flex-1 bg-slate-950 border border-rose-500/30 rounded p-2 text-xs text-slate-200"
                                   value={wRejectReason}
                                   onChange={(e) => setWRejectReason(e.target.value)}
                                 />
                                 <Button
                                   size="sm"
                                   className="bg-rose-600 hover:bg-rose-500 shrink-0"
                                   onClick={() => rejectWithdrawalMutation.mutate({ id: req._id, reason: wRejectReason })}
                                   isLoading={rejectWithdrawalMutation.isPending}
                                   disabled={!wRejectReason.trim()}
                                 >
                                   Confirm Reject & Refund
                                 </Button>
                                 <Button size="sm" variant="secondary" onClick={() => setWRejectingId(null)}>
                                   Cancel
                                 </Button>
                               </div>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30"
                                  onClick={() => setWRejectingId(req._id)}
                                >
                                  Reject
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white border-none shadow-lg shadow-emerald-500/20"
                                  onClick={() => approveWithdrawalMutation.mutate(req._id)}
                                  isLoading={approveWithdrawalMutation.isPending}
                                >
                                  MARK PAID
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {wPagination.pages > 1 && (
                      <div className="flex justify-center items-center gap-4 mt-6 pt-4 border-t border-slate-800">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={wPage === 1}
                          onClick={() => setWPage(wPage - 1)}
                        >
                          Prev
                        </Button>
                        <span className="text-sm font-semibold text-slate-400">
                          Page {wPage} of {wPagination.pages}
                        </span>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={wPage === wPagination.pages}
                          onClick={() => setWPage(wPage + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox for Screenshot */}
      {selectedProof && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm"
          onClick={handleCloseScreenshot}
        >
          <button 
            className="absolute top-6 right-6 text-slate-400 hover:text-white p-2 transition-colors"
            onClick={handleCloseScreenshot}
          >
            ✕ Close
          </button>
          <img 
            src={selectedProof} 
            alt="Payment Proof" 
            className="max-w-full max-h-[85vh] object-contain rounded-lg border border-slate-700 shadow-2xl"
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}

      {/* Lightbox for QR Code */}
      {selectedQr && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setSelectedQr(null)}
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-sm w-full flex flex-col items-center shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <button 
              className="absolute top-4 right-4 text-slate-500 hover:text-white p-2 transition-colors"
              onClick={() => setSelectedQr(null)}
            >
              ✕
            </button>
            <h3 className="text-xl font-bold text-white mb-1">Withdrawal QR</h3>
            <p className="text-slate-400 text-sm mb-6 text-center">Scan to pay <span className="font-bold text-indigo-400">{selectedQr.user}</span></p>
            
            <div className="bg-white p-4 rounded-xl mb-6 shadow-inner">
              {(() => {
                const upiUri = `upi://pay?pa=${encodeURIComponent(selectedQr.upiId)}&pn=${encodeURIComponent(selectedQr.user || 'User')}&am=${Number(selectedQr.amount).toFixed(2)}&cu=INR`;
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUri)}`;
                return (
                  <img 
                    src={qrUrl} 
                    alt="UPI QR Code" 
                    className="w-[250px] h-[250px]"
                  />
                );
              })()}
            </div>
            
            <div className="text-center space-y-1 mb-6">
              <div className="text-xs text-slate-500 uppercase tracking-widest font-bold">Amount</div>
              <div className="text-3xl font-black text-rose-400">₹{selectedQr.amount}</div>
            </div>
            
            <div className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg text-center flex items-center justify-between">
              <span className="font-mono text-slate-300 text-sm truncate">{selectedQr.upiId}</span>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(selectedQr.upiId);
                  toast.success("UPI ID Copied!");
                }}
                className="text-indigo-400 hover:text-indigo-300 text-xs font-bold uppercase ml-2"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

