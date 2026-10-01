import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Send } from "lucide-react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { Card, PageHeader } from "../components/ui";

export default function AppointmentRoom() {
  const { id } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const [appointment, setAppointment] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    client.get(`/appointments/${id}`).then((res) => {
      setAppointment(res.data.appointment);
      setMessages(res.data.messages);
    });
  }, [id]);

  useEffect(() => {
    if (!socket) return;
    socket.emit("appointment:join", id);
    const onMessage = (msg) => {
      if (String(msg.appointment_id) !== String(id)) return;
      setMessages((m) => {
        if (m.some((existing) => String(existing.id) === String(msg.id))) return m;
        return [...m, msg];
      });
    };
    socket.on("appointment:message", onMessage);
    return () => socket.off("appointment:message", onMessage);
  }, [socket, id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function sendMessage(e) {
    e.preventDefault();
    if (!draft.trim() || !socket) return;
    socket.emit("appointment:message", { appointmentId: id, message: draft.trim() });
    setDraft("");
  }

  if (!appointment) return <p className="text-gray-500">Loading consultation room…</p>;

  return (
    <div>
      <PageHeader
        title={`Consultation · ${user.role === "farmer" ? "Dr. " + appointment.vet_name : appointment.farmer_name}`}
        subtitle={appointment.animal_name ? `Regarding ${appointment.animal_name}` : "General consultation"}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden p-0 lg:col-span-2">
          <iframe
            title="Video consultation"
            src={`https://meet.jit.si/${appointment.meeting_room}`}
            allow="camera; microphone; fullscreen; display-capture"
            className="h-[480px] w-full border-0"
          />
        </Card>

        <Card className="flex h-[480px] flex-col p-0">
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-semibold text-ink">Chat</p>
          </div>
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3 scrollbar-thin">
            {messages.length === 0 && (
              <p className="text-sm text-gray-400">Say hello to get the conversation started.</p>
            )}
            {messages.map((m) => {
              const isMe = String(m.sender_id) === String(user.id);
              return (
                <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                      isMe ? "bg-pasture-600 text-white" : "bg-gray-100 text-ink"
                    }`}
                  >
                    {!isMe && (
                      <p className="mb-0.5 text-[11px] font-semibold opacity-70">{m.sender_name}</p>
                    )}
                    {m.message}
                  </div>
                </div>
              );
            })}
          </div>
          <form onSubmit={sendMessage} className="flex items-center gap-2 border-t border-gray-100 px-3 py-3">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-pasture-400"
            />
            <button type="submit" className="flex h-9 w-9 items-center justify-center rounded-lg bg-pasture-600 text-white hover:bg-pasture-700">
              <Send size={16} />
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
