import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { Spinner } from "../../components/common/Spinner";
import { Badge } from "../../components/common/Badge";
import { toast } from "react-hot-toast";
import { BellRing, Send, Trash2 } from "lucide-react";

export const AdminAnnouncements = () => {
  const queryClient = useQueryClient();
  
  // Form State
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("General");
  const [isCreating, setIsCreating] = useState(false);

  // Queries
  const { data: announcements, isLoading } = useQuery({
    queryKey: ["adminAnnouncements"],
    queryFn: async () => {
      const res = await api.get("/admin/announcements");
      return res.data.data;
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload) => {
      await api.post("/admin/announcements", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminAnnouncements"] });
      toast.success("Announcement broadcasted successfully!");
      setTitle("");
      setMessage("");
      setType("General");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to create announcement.");
    },
    onSettled: () => setIsCreating(false),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/admin/announcements/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminAnnouncements"] });
      toast.success("Announcement deactivated.");
    },
    onError: (err) => {
      toast.error("Failed to deactivate announcement.");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error("Title and message are required");
      return;
    }
    setIsCreating(true);
    createMutation.mutate({ title, message, type });
  };

  const getTypeBadge = (announcementType) => {
    switch (announcementType) {
      case 'Important': return <Badge variant="danger">Important</Badge>;
      case 'System': return <Badge variant="warning">System</Badge>;
      case 'Promotion': return <Badge variant="success">Promotion</Badge>;
      default: return <Badge variant="neutral">General</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Announcement Form */}
      <Card title="Broadcast New Announcement" icon={<BellRing size={20} className="text-indigo-400" />}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Announcement Title"
              placeholder="e.g. Server Maintenance..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                Category
              </label>
              <select
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="General">General</option>
                <option value="Important">Important</option>
                <option value="System">System</option>
                <option value="Promotion">Promotion</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
              Message Content
            </label>
            <textarea
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors min-h-[100px] resize-y"
              placeholder="Type your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              isLoading={isCreating}
              className="flex items-center gap-2"
            >
              <Send size={16} />
              Broadcast Now
            </Button>
          </div>
        </form>
      </Card>

      {/* Announcements List */}
      <Card title="Past Announcements">
        {isLoading ? (
          <Spinner className="py-8" />
        ) : announcements && announcements.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-xs font-bold uppercase pb-3">
                  <th className="pb-3 pr-4">Title</th>
                  <th className="pb-3 px-4">Category</th>
                  <th className="pb-3 px-4">Status</th>
                  <th className="pb-3 px-4">Date</th>
                  <th className="pb-3 pl-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-350">
                {announcements.map((a) => (
                  <tr key={a._id} className={`hover:bg-slate-800/10 ${!a.isActive ? 'opacity-50' : ''}`}>
                    <td className="py-3.5 pr-4">
                      <div className="font-bold text-slate-200">{a.title}</div>
                      <div className="text-xs text-slate-500 truncate max-w-xs">{a.message}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {getTypeBadge(a.type)}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={a.isActive ? "success" : "neutral"}>
                        {a.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      {new Date(a.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 pl-4 text-right">
                      {a.isActive && (
                        <button
                          onClick={() => {
                            if(window.confirm("Are you sure you want to deactivate this announcement?")) {
                              deactivateMutation.mutate(a._id);
                            }
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                          title="Deactivate"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">
            No announcements broadcasted yet.
          </div>
        )}
      </Card>
    </div>
  );
};
