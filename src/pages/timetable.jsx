import {
  ArrowLeft,
  Clock,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  X,
  Save,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const defaultTimetable = [
  {
    day: "Monday",
    classes: [
      {
        subject: "Data Structures",
        section: "3RD-CSE_23",
        start: "11:00 AM",
        end: "12:00 PM",
        room: "C-15",
      },
      {
        subject: "Database Management",
        section: "3RD-CSE_23",
        start: "02:00 PM",
        end: "03:00 PM",
        room: "C-15",
      },
    ],
  },
  {
    day: "Tuesday",
    classes: [
      {
        subject: "Data Structures",
        section: "3RD-CSE_23",
        start: "09:00 AM",
        end: "10:00 AM",
        room: "C-15",
      },
      {
        subject: "Operating Systems",
        section: "3RD-CSE_23",
        start: "12:00 PM",
        end: "01:00 PM",
        room: "C-16",
      },
    ],
  },
  {
    day: "Wednesday",
    classes: [
      {
        subject: "Database Management",
        section: "3RD-CSE_23",
        start: "11:00 AM",
        end: "12:00 PM",
        room: "C-15",
      },
    ],
  },
  {
    day: "Thursday",
    classes: [
      {
        subject: "Data Structures",
        section: "3RD-CSE_23",
        start: "11:00 AM",
        end: "12:00 PM",
        room: "C-15",
      },
      {
        subject: "Computer Networks",
        section: "3RD-CSE_23",
        start: "03:00 PM",
        end: "04:00 PM",
        room: "C-17",
      },
    ],
  },
  {
    day: "Friday",
    classes: [
      {
        subject: "Operating Systems",
        section: "3RD-CSE_23",
        start: "10:00 AM",
        end: "11:00 AM",
        room: "C-16",
      },
    ],
  },
];

const emptyForm = {
  day: "Monday",
  subject: "",
  section: "3RD-CSE_23",
  start: "",
  end: "",
  room: "",
};

function Timetable() {
  const navigate = useNavigate();

  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);

  const [form, setForm] = useState(emptyForm);

  const loadTimetable = async () => {
    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      navigate("/login");
      return;
    }

    const { data, error } = await supabase
      .from("timetable")
      .select(
        "id, day, subject, section, start_time, end_time, room"
      )
      .eq("teacher_id", user.id)
      .order("id", { ascending: true });

    if (error) {
      console.error(error);
      alert("Failed to load timetable.");
      setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      const defaultRows = [];

      defaultTimetable.forEach((day) => {
        day.classes.forEach((item) => {
          defaultRows.push({
            teacher_id: user.id,
            day: day.day,
            subject: item.subject,
            section: item.section,
            start_time: item.start,
            end_time: item.end,
            room: item.room,
          });
        });
      });

      const { data: inserted, error: insertError } = await supabase
        .from("timetable")
        .insert(defaultRows)
        .select(
          "id, day, subject, section, start_time, end_time, room"
        );

      if (insertError) {
        console.error(insertError);
        alert("Failed to create default timetable.");
        setLoading(false);
        return;
      }

      setTimetable(inserted || []);
    } else {
      setTimetable(data);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadTimetable();
  }, []);

  const openAddModal = () => {
    setEditingClass(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingClass(item.id);

    setForm({
      day: item.day,
      subject: item.subject,
      section: item.section,
      start: item.start_time,
      end: item.end_time,
      room: item.room,
    });

    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingClass(null);
    setForm(emptyForm);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const saveClass = async (e) => {
    e.preventDefault();

    if (
      !form.subject.trim() ||
      !form.section.trim() ||
      !form.start.trim() ||
      !form.end.trim() ||
      !form.room.trim()
    ) {
      alert("Please fill all fields.");
      return;
    }

    setSaving(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      alert("Please login again.");
      setSaving(false);
      navigate("/login");
      return;
    }

    const payload = {
      day: form.day,
      subject: form.subject.trim(),
      section: form.section.trim(),
      start_time: form.start.trim(),
      end_time: form.end.trim(),
      room: form.room.trim(),
    };

    if (editingClass) {
      const { error } = await supabase
        .from("timetable")
        .update(payload)
        .eq("id", editingClass)
        .eq("teacher_id", user.id);

      if (error) {
        console.error(error);
        alert("Failed to update timetable.");
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase
        .from("timetable")
        .insert({
          ...payload,
          teacher_id: user.id,
        });

      if (error) {
        console.error(error);
        alert("Failed to add timetable class.");
        setSaving(false);
        return;
      }
    }

    await loadTimetable();

    setSaving(false);
    setShowModal(false);
    setEditingClass(null);
    setForm(emptyForm);
  };

  const deleteClass = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this class?"
    );

    if (!confirmed) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      navigate("/login");
      return;
    }

    const { error } = await supabase
      .from("timetable")
      .delete()
      .eq("id", id)
      .eq("teacher_id", user.id);

    if (error) {
      console.error(error);
      alert("Failed to delete class.");
      return;
    }

    setTimetable((prev) =>
      prev.filter((item) => item.id !== id)
    );
  };

  const groupedTimetable = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ].map((day) => ({
    day,
    classes: timetable.filter((item) => item.day === day),
  }));

  return (
    <div className="timetable-page">
      <button
        className="back-button"
        onClick={() => navigate("/dashboard")}
      >
        <ArrowLeft size={18} />
        Dashboard
      </button>

      <div className="timetable-title">
        <div>
          <h2>Timetable</h2>
          <p>Your weekly teaching schedule</p>
        </div>

        <div className="timetable-actions">
          <div className="week-badge">
            Current Week
          </div>

          <button
            className="add-timetable-button"
            onClick={openAddModal}
          >
            <Plus size={17} />
            Add Class
          </button>
        </div>
      </div>

      {loading ? (
        <div className="timetable-card timetable-loading">
          Loading timetable...
        </div>
      ) : (
        <div className="timetable-card">
          <div className="timetable-header">
            <span>Day</span>
            <span>Subject</span>
            <span>Section</span>
            <span>Time</span>
            <span>Location</span>
            <span>Actions</span>
          </div>

          {groupedTimetable.map((day) => {
            if (day.classes.length === 0) return null;

            return day.classes.map((item) => (
              <div
                className="timetable-row"
                key={item.id}
              >
                <strong>{day.day}</strong>

                <div>
                  <strong>{item.subject}</strong>
                </div>

                <span>{item.section}</span>

                <span className="time-cell">
                  <Clock size={15} />
                  {item.start_time} - {item.end_time}
                </span>

                <span className="room-cell">
                  <MapPin size={15} />
                  {item.room}
                </span>

                <div className="timetable-actions-row">
                  <button
                    className="edit-timetable-button"
                    onClick={() => openEditModal(item)}
                    title="Edit class"
                  >
                    <Pencil size={15} />
                    Edit
                  </button>

                  <button
                    className="delete-timetable-button"
                    onClick={() => deleteClass(item.id)}
                    title="Delete class"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ));
          })}
        </div>
      )}

      {showModal && (
        <div className="timetable-modal-overlay">
          <div className="timetable-modal">
            <div className="timetable-modal-header">
              <div>
                <h3>
                  {editingClass
                    ? "Edit Timetable"
                    : "Add Class"}
                </h3>

                <p>
                  {editingClass
                    ? "Update your class schedule"
                    : "Add a new class to your schedule"}
                </p>
              </div>

              <button
                className="close-timetable-modal"
                onClick={closeModal}
                disabled={saving}
              >
                <X size={20} />
              </button>
            </div>

            <form
              className="timetable-form"
              onSubmit={saveClass}
            >
              <div className="timetable-form-grid">
                <div className="timetable-field">
                  <label>Day</label>

                  <select
                    name="day"
                    value={form.day}
                    onChange={handleChange}
                  >
                    <option>Monday</option>
                    <option>Tuesday</option>
                    <option>Wednesday</option>
                    <option>Thursday</option>
                    <option>Friday</option>
                    <option>Saturday</option>
                  </select>
                </div>

                <div className="timetable-field">
                  <label>Subject</label>

                  <input
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    placeholder="e.g. Data Structures"
                  />
                </div>

                <div className="timetable-field">
                  <label>Section</label>

                  <input
                    name="section"
                    value={form.section}
                    onChange={handleChange}
                    placeholder="e.g. 3RD-CSE_23"
                  />
                </div>

                <div className="timetable-field">
                  <label>Room</label>

                  <input
                    name="room"
                    value={form.room}
                    onChange={handleChange}
                    placeholder="e.g. C-15"
                  />
                </div>

                <div className="timetable-field">
                  <label>Start Time</label>

                  <input
                    name="start"
                    value={form.start}
                    onChange={handleChange}
                    placeholder="e.g. 11:00 AM"
                  />
                </div>

                <div className="timetable-field">
                  <label>End Time</label>

                  <input
                    name="end"
                    value={form.end}
                    onChange={handleChange}
                    placeholder="e.g. 12:00 PM"
                  />
                </div>
              </div>

              <div className="timetable-modal-actions">
                <button
                  type="button"
                  className="timetable-cancel-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="timetable-save-button"
                  disabled={saving}
                >
                  <Save size={16} />

                  {saving
                    ? "Saving..."
                    : editingClass
                    ? "Save Changes"
                    : "Add Class"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Timetable;