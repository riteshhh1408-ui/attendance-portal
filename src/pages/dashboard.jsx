import { useEffect, useState } from "react";
import { LayoutDashboard } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function Dashboard() {
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [present, setPresent] = useState(0);
  const [absent, setAbsent] = useState(0);
  const [loading, setLoading] = useState(true);

  const section = "3RD-CSE_23";

  const getTodayDate = () => {
    const today = new Date();

    return `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}-${String(
      today.getDate()
    ).padStart(2, "0")}`;
  };

  useEffect(() => {
    loadDashboardData();

    const handleFocus = () => {
      loadDashboardData();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert("Logout failed: " + error.message);
      return;
    }

    navigate("/login");
  };

  const loadDashboardData = async () => {
    setLoading(true);

    const todayDate = getTodayDate();

    /*
     * LOAD STUDENTS
     */

    const {
      data: studentData,
      error: studentError,
    } = await supabase
      .from("students")
      .select("id, section, roll_no, name")
      .eq("section", section)
      .order("roll_no", {
        ascending: true,
      });

    if (studentError) {
      console.error(studentError);

      alert(
        "Could not load students: " +
          studentError.message
      );

      setStudents([]);
      setPresent(0);
      setAbsent(0);
      setLoading(false);

      return;
    }

    const studentList = studentData || [];

    setStudents(studentList);

    /*
     * LOAD TODAY'S ATTENDANCE
     */

    const {
      data: attendanceData,
      error: attendanceError,
    } = await supabase
      .from("attendance")
      .select(
        "roll_no, subject, status, created_at"
      )
      .eq("section", section)
      .eq("attendance_date", todayDate)
      .order("created_at", {
        ascending: false,
      });

    if (attendanceError) {
      console.error(attendanceError);

      alert(
        "Could not load today's attendance: " +
          attendanceError.message
      );

      setPresent(0);
      setAbsent(0);
      setLoading(false);

      return;
    }

    /*
     * EACH STUDENT IS COUNTED ONLY ONCE.
     *
     * If a student has attendance for
     * multiple subjects, the latest
     * saved record is used.
     */

    const latestAttendance = {};

    (attendanceData || []).forEach((record) => {
      const roll = String(record.roll_no);

      if (
        !Object.prototype.hasOwnProperty.call(
          latestAttendance,
          roll
        )
      ) {
        latestAttendance[roll] =
          record.status;
      }
    });

    let totalPresent = 0;
    let totalAbsent = 0;

    studentList.forEach((student) => {
      const roll = String(student.roll_no);

      if (
        Object.prototype.hasOwnProperty.call(
          latestAttendance,
          roll
        )
      ) {
        if (latestAttendance[roll] === true) {
          totalPresent++;
        } else {
          totalAbsent++;
        }
      }
    });

    setPresent(totalPresent);
    setAbsent(totalAbsent);

    setLoading(false);
  };

  /*
   * ATTENDANCE PERCENTAGE
   */

  const totalAttendance =
    present + absent;

  const attendancePercentage =
    totalAttendance > 0
      ? (
          (present / totalAttendance) *
          100
        ).toFixed(1)
      : "0.0";

  /*
   * TODAY'S CLASSES
   */

  const classes = [
    {
      subject: "Data Structures",
      section: "3RD-CSE_23",
      start: "11:00 AM",
      end: "12:00 PM",
    },
    {
      subject: "Database Management",
      section: "3RD-CSE_23",
      start: "02:00 PM",
      end: "03:00 PM",
    },
  ];

  return (
    <div className="dashboard">

      {/* SIDEBAR */}

      <aside>

        <div className="brand">

          <LayoutDashboard size={25} />

          <span>
            Attendance
          </span>

        </div>

        <nav>

          <Link
            to="/dashboard"
            className="active"
          >
            Dashboard
          </Link>

          <Link to="/attendance">
            Attendance
          </Link>

          <Link to="/students">
            Students
          </Link>

          <Link to="/timetable">
            Timetable
          </Link>

          <Link to="/reports">
            Reports
          </Link>

        </nav>

      </aside>

      {/* MAIN */}

      <main>

        {/* HEADER */}

        <header>

          <div>

            <h2>
              Dashboard
            </h2>

            <p>
              Welcome back, Teacher
            </p>

          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
            }}
          >

            {/* REFRESH */}

            <button
              onClick={loadDashboardData}
              disabled={loading}
              style={{
                padding: "12px 20px",
                background: "white",
                border: "1px solid #d9e0ea",
                borderRadius: "8px",
                fontSize: "16px",
                cursor: loading
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              {loading
                ? "Refreshing..."
                : "Refresh"}
            </button>

            {/* LOGOUT */}

            <button
              onClick={handleLogout}
              style={{
                padding: "12px 24px",
                background: "white",
                border: "1px solid #d9e0ea",
                borderRadius: "8px",
                fontSize: "16px",
                cursor: "pointer",
              }}
            >
              Logout
            </button>

          </div>

        </header>

        {/* STATS */}

        <div className="stats">

          {/* TOTAL STUDENTS */}

          <div className="stat-card">

            <span>
              Total Students
            </span>

            <strong>
              {loading
                ? "..."
                : students.length}
            </strong>

          </div>

          {/* PRESENT */}

          <div className="stat-card">

            <span>
              Present Today
            </span>

            <strong>
              {loading
                ? "..."
                : present}
            </strong>

          </div>

          {/* ABSENT */}

          <div className="stat-card">

            <span>
              Absent Today
            </span>

            <strong>
              {loading
                ? "..."
                : absent}
            </strong>

          </div>

          {/* PERCENTAGE */}

          <div className="stat-card">

            <span>
              Attendance
            </span>

            <strong>
              {loading
                ? "..."
                : `${attendancePercentage}%`}
            </strong>

          </div>

        </div>

        {/* TODAY'S CLASSES */}

        <div className="content-card">

          <div className="section-header">

            <h3>
              Today's Classes
            </h3>

            <p>
              Scheduled classes for today
            </p>

          </div>

          {classes.map(
            (item, index) => (

              <div
                className="class-row"
                key={index}
              >

                <div>

                  <strong>
                    {item.subject}
                  </strong>

                  <span>
                    {item.section}
                  </span>

                </div>

                <div>
                  {item.start} -{" "}
                  {item.end}
                </div>

                <button
                  onClick={() =>
                    navigate(
                      `/attendance?subject=${encodeURIComponent(
                        item.subject
                      )}`
                    )
                  }
                >
                  Mark Attendance
                </button>

              </div>

            )
          )}

        </div>

      </main>

    </div>
  );
}

export default Dashboard;