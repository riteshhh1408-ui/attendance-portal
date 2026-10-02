import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Edit,
  Plus,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function Students() {
  const navigate = useNavigate();

  const [section, setSection] = useState("3RD-CSE_23");
  const [students, setStudents] = useState([]);

  const [roll, setRoll] = useState("");
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const getCurrentUser = async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      alert("Your session has expired. Please login again.");
      navigate("/login");
      return null;
    }

    return user;
  };

  const fetchStudents = async () => {
    setLoading(true);

    const {
      data,
      error,
    } = await supabase
      .from("students")
      .select("id, section, roll_no, name, teacher_id")
      .eq("section", section)
      .order("roll_no", {
        ascending: true,
      });

    setLoading(false);

    if (error) {
      console.error(error);

      alert(
        "Could not load students: " +
          error.message
      );

      return;
    }

    setStudents(data || []);
  };

  useEffect(() => {
    fetchStudents();

    setEditingId(null);
    setRoll("");
    setName("");
  }, [section]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanRoll = roll.trim();
    const cleanName = name.trim();

    if (!cleanRoll || !cleanName) {
      alert("Enter roll number and student name");
      return;
    }

    setSaving(true);

    const user = await getCurrentUser();

    if (!user) {
      setSaving(false);
      return;
    }

    /*
     * ================================
     * EDIT / UPDATE STUDENT
     * ================================
     */

    if (editingId !== null) {
      const duplicate = students.some(
        (student) =>
          String(student.roll_no) === cleanRoll &&
          student.id !== editingId
      );

      if (duplicate) {
        setSaving(false);
        alert("This roll number already exists");
        return;
      }

      const {
        data,
        error,
      } = await supabase
        .from("students")
        .update({
          roll_no: cleanRoll,
          name: cleanName,
        })
        .eq("id", editingId)
        .eq("section", section)
        .eq("teacher_id", user.id)
        .select(
          "id, section, roll_no, name, teacher_id"
        );

      if (error) {
        console.error(error);

        setSaving(false);

        alert(
          "Could not update student: " +
            error.message
        );

        return;
      }

      setSaving(false);

      if (!data || data.length === 0) {
        alert(
          "Student could not be updated. Please make sure this student belongs to your account."
        );

        return;
      }

      alert("Student updated successfully");

      setEditingId(null);
      setRoll("");
      setName("");

      await fetchStudents();

      return;
    }

    /*
     * ================================
     * CHECK DUPLICATE FOR NEW STUDENT
     * ================================
     */

    const duplicate = students.some(
      (student) =>
        String(student.roll_no) === cleanRoll
    );

    if (duplicate) {
      setSaving(false);
      alert("This roll number already exists");
      return;
    }

    /*
     * ================================
     * ADD NEW STUDENT
     * ================================
     */

    const {
      error,
    } = await supabase
      .from("students")
      .insert({
        teacher_id: user.id,
        section,
        roll_no: cleanRoll,
        name: cleanName,
      });

    setSaving(false);

    if (error) {
      console.error(error);

      alert(
        "Could not add student: " +
          error.message
      );

      return;
    }

    setRoll("");
    setName("");

    await fetchStudents();

    alert("Student added successfully");
  };

  /*
   * ================================
   * START EDIT
   * ================================
   */

  const startEdit = (student) => {
  alert("EDIT CLICKED: " + student.name);

  setEditingId(student.id);
  setRoll(String(student.roll_no));
  setName(student.name);
};

  /*
   * ================================
   * CANCEL EDIT
   * ================================
   */

  const cancelEdit = () => {
    setEditingId(null);
    setRoll("");
    setName("");
  };

  /*
   * ================================
   * DELETE STUDENT
   * ================================
   */

  const deleteStudent = async (student) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${student.name}?`
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);

    const user = await getCurrentUser();

    if (!user) {
      setSaving(false);
      return;
    }

    const {
      data,
      error,
    } = await supabase
      .from("students")
      .delete()
      .eq("id", student.id)
      .eq("section", section)
      .eq("teacher_id", user.id)
      .select("id");

    setSaving(false);

    if (error) {
      console.error(error);

      alert(
        "Could not delete student: " +
          error.message
      );

      return;
    }

    if (!data || data.length === 0) {
      alert(
        "Student could not be deleted. Please make sure this student belongs to your account."
      );

      return;
    }

    if (editingId === student.id) {
      cancelEdit();
    }

    await fetchStudents();

    alert("Student deleted successfully");
  };

  /*
   * ================================
   * CSV IMPORT
   * ================================
   */

  const importCSV = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = async (e) => {
      const text = e.target.result;

      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length < 2) {
        alert("CSV file is empty or invalid");
        return;
      }

      const importedStudents = [];

      lines.slice(1).forEach((line) => {
        const parts = line.split(",");

        if (parts.length >= 2) {
          const importedRoll = parts[0]
            .replace(/^\uFEFF/, "")
            .trim();

          const importedName = parts
            .slice(1)
            .join(",")
            .trim();

          if (
            importedRoll &&
            importedName
          ) {
            importedStudents.push({
              section,
              roll_no: importedRoll,
              name: importedName,
            });
          }
        }
      });

      if (importedStudents.length === 0) {
        alert("No students found in CSV");
        return;
      }

      /*
       * CHECK DUPLICATE ROLLS IN CSV
       */

      const rollSet = new Set();

      for (const student of importedStudents) {
        if (rollSet.has(student.roll_no)) {
          alert(
            "Duplicate roll number found in CSV: " +
              student.roll_no
          );

          return;
        }

        rollSet.add(student.roll_no);
      }

      const confirmed = window.confirm(
        `${importedStudents.length} students found.\n\nThis will replace the current student list for ${section}.\n\nContinue?`
      );

      if (!confirmed) {
        return;
      }

      setSaving(true);

      const user = await getCurrentUser();

      if (!user) {
        setSaving(false);
        return;
      }

      /*
       * DELETE CURRENT TEACHER'S STUDENTS
       */

      const {
        error: deleteError,
      } = await supabase
        .from("students")
        .delete()
        .eq("section", section)
        .eq("teacher_id", user.id);

      if (deleteError) {
        console.error(deleteError);

        setSaving(false);

        alert(
          "Could not clear existing students: " +
            deleteError.message
        );

        return;
      }

      /*
       * ADD TEACHER ID TO IMPORTED STUDENTS
       */

      const studentsToInsert =
        importedStudents.map(
          (student) => ({
            ...student,
            teacher_id: user.id,
          })
        );

      /*
       * INSERT IMPORTED STUDENTS
       */

      const {
        error: insertError,
      } = await supabase
        .from("students")
        .insert(studentsToInsert);

      setSaving(false);

      if (insertError) {
        console.error(insertError);

        alert(
          "Could not import students: " +
            insertError.message
        );

        await fetchStudents();

        return;
      }

      setEditingId(null);
      setRoll("");
      setName("");

      await fetchStudents();

      alert(
        `${importedStudents.length} students imported successfully`
      );
    };

    reader.readAsText(file);

    event.target.value = "";
  };

  return (
    <div className="students-page">

      {/* =========================
          BACK BUTTON
          ========================= */}

      <button
        className="back-button"
        onClick={() =>
          navigate("/dashboard")
        }
      >
        <ArrowLeft size={18} />
        Dashboard
      </button>

      {/* =========================
          TITLE
          ========================= */}

      <div className="students-title">

        <div>
          <h2>Students</h2>

          <p>
            Manage students for each section
          </p>
        </div>

        <div className="student-count">
          <Users size={20} />
          {students.length} Students
        </div>

      </div>

      {/* =========================
          SECTION + CSV
          ========================= */}

      <div className="students-controls">

        <div>

          <label>
            Section
          </label>

          <select
            value={section}
            onChange={(e) =>
              setSection(
                e.target.value
              )
            }
          >
            <option value="3RD-CSE_23">
              3RD-CSE_23
            </option>

            <option value="3RD-CSE_24">
              3RD-CSE_24
            </option>

            <option value="3RD-CSE_25">
              3RD-CSE_25
            </option>
          </select>

        </div>

        <label className="import-button">

          <Upload size={17} />

          Import CSV

          <input
            type="file"
            accept=".csv"
            onChange={importCSV}
            hidden
          />

        </label>

      </div>

      {/* =========================
          ADD / EDIT FORM
          ========================= */}

      <div className="student-form-card">

        <h3>
          {editingId !== null
            ? "Edit Student"
            : "Add Student"}
        </h3>

        <form
          onSubmit={handleSubmit}
        >

          <input
            type="text"
            placeholder="Roll Number"
            value={roll}
            onChange={(e) =>
              setRoll(
                e.target.value
              )
            }
            required
          />

          <input
            type="text"
            placeholder="Student Name"
            value={name}
            onChange={(e) =>
              setName(
                e.target.value
              )
            }
            required
          />

          <button
            type="submit"
            className="save-student"
            disabled={saving}
          >

            {editingId !== null ? (
              <Edit size={17} />
            ) : (
              <Plus size={17} />
            )}

            {saving
              ? "Saving..."
              : editingId !== null
              ? "Update Student"
              : "Add Student"}

          </button>

          {editingId !== null && (
            <button
              type="button"
              className="cancel-button"
              onClick={cancelEdit}
              disabled={saving}
            >
              Cancel
            </button>
          )}

        </form>

      </div>

      {/* =========================
          STUDENTS TABLE
          ========================= */}

      <div className="students-table-card">

        <div className="students-table-header">

          <span>
            Roll No.
          </span>

          <span>
            Student Name
          </span>

          <span>
            Actions
          </span>

        </div>

        {loading ? (
          <div className="empty-students">
            Loading students...
          </div>
        ) : students.length === 0 ? (
          <div className="empty-students">
            No students added to this section.
          </div>
        ) : (
          students.map((student) => (

            <div
              className="students-table-row"
              key={student.id}
            >

              <span>
                {student.roll_no}
              </span>

              <strong>
                {student.name}
              </strong>

              <div className="student-actions">

                <button
                  type="button"
                  className="edit-student"
                  onClick={() =>
                    startEdit(student)
                  }
                  disabled={saving}
                >
                  <Edit size={16} />
                  Edit
                </button>

                <button
                  type="button"
                  className="delete-student"
                  onClick={() =>
                    deleteStudent(student)
                  }
                  disabled={saving}
                >
                  <Trash2 size={16} />
                  Delete
                </button>

              </div>

            </div>

          ))
        )}

      </div>

    </div>
  );
}

export default Students;