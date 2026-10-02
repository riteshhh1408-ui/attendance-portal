import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  FileSpreadsheet,
  Save,
  Upload,
  Users,
  X,
} from "lucide-react";
import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import * as XLSX from "xlsx";
import { supabase } from "../lib/supabase";

function Attendance() {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const subjectFromUrl = searchParams.get("subject");

  const [section, setSection] = useState("3RD-CSE_23");

  const [subject, setSubject] = useState(
    subjectFromUrl || "Data Structures"
  );

const getTodayDate = () => {
  const today = new Date();

  return `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(
    today.getDate()
  ).padStart(2, "0")}`;
};

const [date, setDate] = useState(getTodayDate());

  const [students, setStudents] = useState([]);

  const [attendance, setAttendance] = useState({});

  const [saved, setSaved] = useState(false);

  const [loading, setLoading] = useState(false);

  const [saving, setSaving] = useState(false);

  const [fileName, setFileName] = useState("");

  const [uploadMessage, setUploadMessage] = useState("");

  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (subjectFromUrl) {
      setSubject(subjectFromUrl);
    }
  }, [subjectFromUrl]);

  /*
   * Load students and existing attendance
   * from Supabase
   */

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      setSaved(false);
      setPreview(null);
      setUploadMessage("");
      setFileName("");

      /*
       * Load students
       */

      const { data: studentData, error: studentError } =
        await supabase
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
        setAttendance({});
        setLoading(false);

        return;
      }

      const loadedStudents = studentData || [];

      setStudents(loadedStudents);

      /*
       * Load saved attendance
       */
const {
  data: {
    user,
  },
  error: userError,
} = await supabase.auth.getUser();

if (userError || !user) {
  alert("Your session has expired. Please login again.");
  navigate("/login");
  return;
}

const {
  data: attendanceData,
  error: attendanceError,
} = await supabase
  .from("attendance")
  .select("roll_no, status")
  .eq("teacher_id", user.id)
  .eq("section", section)
  .eq("subject", subject)
  .eq("attendance_date", date);
      
       /* Convert database records into:
       *
       * {
       *   "01": true,
       *   "02": false
       * }
       */

      const existingAttendance =
        {};

      (attendanceData || []).forEach(
        (record) => {
          existingAttendance[
            String(record.roll_no)
          ] = record.status;
        }
      );

      /*
       * If attendance already exists,
       * use it.
       *
       * Otherwise everyone starts Present.
       */

      if (
        attendanceData &&
        attendanceData.length > 0
      ) {
        const newAttendance = {};

        loadedStudents.forEach(
          (student) => {
            const roll = String(
              student.roll_no
            );

            if (
              Object.prototype.hasOwnProperty.call(
                existingAttendance,
                roll
              )
            ) {
              newAttendance[roll] =
                existingAttendance[roll];
            } else {
              newAttendance[roll] =
                true;
            }
          }
        );

        setAttendance(
          newAttendance
        );
      } else {
        setAttendance(
          Object.fromEntries(
            loadedStudents.map(
              (student) => [
                String(
                  student.roll_no
                ),
                true,
              ]
            )
          )
        );
      }

      setLoading(false);
    };

    loadData();
  }, [section, subject, date]);

  /*
   * Attendance counts
   */

  const presentCount = useMemo(
    () =>
      Object.values(
        attendance
      ).filter(Boolean).length,
    [attendance]
  );

  const absentCount =
    students.length - presentCount;

  /*
   * Toggle individual student
   */

  const toggleAttendance = (
    roll
  ) => {
    setAttendance(
      (current) => ({
        ...current,
        [roll]: !current[roll],
      })
    );

    setSaved(false);
  };

  /*
   * Mark everyone Present
   */

  const markAllPresent = () => {
    setAttendance(
      Object.fromEntries(
        students.map(
          (student) => [
            String(
              student.roll_no
            ),
            true,
          ]
        )
      )
    );

    setSaved(false);
  };

  /*
   * Mark everyone Absent
   */

  const markAllAbsent = () => {
    setAttendance(
      Object.fromEntries(
        students.map(
          (student) => [
            String(
              student.roll_no
            ),
            false,
          ]
        )
      )
    );

    setSaved(false);
  };

  /*
   * Save attendance to Supabase
   */

  const saveAttendance = async () => {
  if (students.length === 0) {
    return;
  }

  setSaving(true);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    setSaving(false);

    alert("Your session has expired. Please login again.");

    navigate("/login");

    return;
  }

  const records = students.map((student) => ({
    teacher_id: user.id,
    section,
    subject,
    attendance_date: date,
    roll_no: String(student.roll_no),
    status: Boolean(
      attendance[String(student.roll_no)]
    ),
  }));

  const { error } = await supabase
    .from("attendance")
    .upsert(records, {
      onConflict:
        "teacher_id,section,subject,attendance_date,roll_no",
    });

  setSaving(false);

  if (error) {
    console.error(error);

    alert(
      "Could not save attendance: " +
        error.message
    );

    return;
  }

  setSaved(true);
  setPreview(null);
};

  /*
   * Process CSV / Excel file
   */

  const processUploadedFile =
    async (file) => {
      if (!file) return;

      const allowedExtensions = [
        ".csv",
        ".xlsx",
        ".xls",
      ];

      const extension =
        file.name
          .substring(
            file.name.lastIndexOf(".")
          )
          .toLowerCase();

      if (
        !allowedExtensions.includes(
          extension
        )
      ) {
        alert(
          "Please upload a CSV or Excel file."
        );

        return;
      }

      if (students.length === 0) {
        alert(
          "No students are registered in this section."
        );

        return;
      }

      setFileName(file.name);

      setUploadMessage(
        "Reading attendance file..."
      );

      try {
        const buffer =
          await file.arrayBuffer();

        const workbook =
          XLSX.read(
            buffer,
            {
              type: "array",
            }
          );

        const firstSheet =
          workbook.Sheets[
            workbook.SheetNames[0]
          ];

        const rows =
          XLSX.utils.sheet_to_json(
            firstSheet,
            {
              defval: "",
            }
          );

        if (!rows.length) {
          alert(
            "The uploaded file is empty."
          );

          setUploadMessage("");

          return;
        }

        const getValue = (
          row,
          possibleNames
        ) => {
          const key =
            Object.keys(
              row
            ).find(
              (key) =>
                possibleNames.includes(
                  key
                    .trim()
                    .toLowerCase()
                )
            );

          return key
            ? String(
                row[key]
              ).trim()
            : "";
        };

        /*
         * Collect uploaded roll numbers
         */

        const uploadedRollNumbers =
          new Set();

        rows.forEach(
          (row) => {
            const roll =
              getValue(
                row,
                [
                  "roll_no",
                  "roll no",
                  "roll",
                  "roll number",
                  "roll_number",
                  "registration no",
                  "registration_no",
                ]
              );

            if (roll) {
              uploadedRollNumbers.add(
                roll
              );

              uploadedRollNumbers.add(
                roll.padStart(
                  2,
                  "0"
                )
              );
            }
          }
        );

        if (
          uploadedRollNumbers.size ===
          0
        ) {
          alert(
            "No Roll Number column found.\n\nUse a column named: roll_no"
          );

          setUploadMessage("");

          return;
        }

        /*
         * Match uploaded rolls
         * with registered students
         */

        const newAttendance =
          {};

        const presentStudents =
          [];

        const absentStudents =
          [];

        students.forEach(
          (student) => {
            const roll =
              String(
                student.roll_no
              ).trim();

            const isPresent =
              uploadedRollNumbers.has(
                roll
              ) ||
              uploadedRollNumbers.has(
                roll.padStart(
                  2,
                  "0"
                )
              );

            newAttendance[
              roll
            ] = isPresent;

            if (isPresent) {
              presentStudents.push(
                student
              );
            } else {
              absentStudents.push(
                student
              );
            }
          }
        );

        /*
         * Show preview
         */

        setPreview({
          attendance:
            newAttendance,
          presentStudents,
          absentStudents,
          total:
            students.length,
          present:
            presentStudents.length,
          absent:
            absentStudents.length,
        });

        setUploadMessage(
          `${presentStudents.length} students detected as present`
        );
      } catch (error) {
        console.error(error);

        alert(
          "Could not read the uploaded file."
        );

        setUploadMessage("");
      }
    };

  /*
   * Confirm uploaded attendance
   */

  const confirmUpload = () => {
    if (!preview) return;

    setAttendance(
      preview.attendance
    );

    setSaved(false);

    setPreview(null);

    setUploadMessage(
      `${preview.present} students marked Present and ${preview.absent} marked Absent.`
    );
  };

  return (
    <div className="attendance-page">

      <div className="page-top">

        <button
          className="back-button"
          onClick={() =>
            navigate(
              "/dashboard"
            )
          }
        >
          <ArrowLeft size={18} />
          Dashboard
        </button>

        <h2>
          Mark Attendance
        </h2>

        <p>
          Record student attendance
          for your class
        </p>

      </div>

      <div className="attendance-controls">

        <div className="control-group">

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

        <div className="control-group">

          <label>
            Subject
          </label>

          <select
            value={subject}
            onChange={(e) =>
              setSubject(
                e.target.value
              )
            }
          >
            <option value="Data Structures">
              Data Structures
            </option>

            <option value="Database Management">
              Database Management
            </option>

            <option value="Operating Systems">
              Operating Systems
            </option>

            <option value="Computer Networks">
              Computer Networks
            </option>
          </select>

        </div>

        <div className="control-group">

          <label>
            Date
          </label>

          <input
            type="date"
            value={date}
            onChange={(e) =>
              setDate(
                e.target.value
              )
            }
          />

        </div>

      </div>

      <div className="upload-card">

        <div>

          <div className="upload-title">

            <FileSpreadsheet
              size={21}
            />

            <strong>
              Upload Attendance
            </strong>

          </div>

          <p>
            Students listed in the
            uploaded CSV/Excel file
            will be marked Present.
            Other students will be
            marked Absent.
          </p>

          {fileName && (
            <span className="file-name">
              File: {fileName}
            </span>
          )}

        </div>

        <label className="upload-button">

          <Upload size={18} />

          Upload CSV / Excel

          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            hidden
            onChange={(e) => {
              processUploadedFile(
                e.target.files[0]
              );

              e.target.value = "";
            }}
          />

        </label>

      </div>

      {uploadMessage && (
        <div className="upload-message">
          {uploadMessage}
        </div>
      )}

      <div className="attendance-summary">

        <div className="summary-card">

          <Users size={21} />

          <div>

            <span>
              Total Students
            </span>

            <strong>
              {students.length}
            </strong>

          </div>

        </div>

        <div className="summary-card present-summary">

          <Check size={21} />

          <div>

            <span>
              Present
            </span>

            <strong>
              {presentCount}
            </strong>

          </div>

        </div>

        <div className="summary-card absent-summary">

          <X size={21} />

          <div>

            <span>
              Absent
            </span>

            <strong>
              {absentCount}
            </strong>

          </div>

        </div>

        <div className="summary-actions">

          <button
            onClick={
              markAllPresent
            }
          >
            Mark All Present
          </button>

          <button
            onClick={
              markAllAbsent
            }
          >
            Mark All Absent
          </button>

        </div>

      </div>

      {preview && (
        <div className="preview-card">

          <div>

            <h3>
              Attendance Preview
            </h3>

            <p>
              {preview.present}{" "}
              students detected in
              uploaded file. The
              remaining{" "}
              {preview.absent}{" "}
              students will be
              marked absent.
            </p>

          </div>

          <div className="preview-stats">

            <div>

              <span>
                Total
              </span>

              <strong>
                {preview.total}
              </strong>

            </div>

            <div className="preview-present">

              <span>
                Present
              </span>

              <strong>
                {preview.present}
              </strong>

            </div>

            <div className="preview-absent">

              <span>
                Absent
              </span>

              <strong>
                {preview.absent}
              </strong>

            </div>

          </div>

          <div className="preview-actions">

            <button
              className="cancel-preview"
              onClick={() =>
                setPreview(null)
              }
            >
              Cancel
            </button>

            <button
              className="confirm-preview"
              onClick={
                confirmUpload
              }
            >
              <Check size={17} />
              Confirm Attendance
            </button>

          </div>

        </div>
      )}

      <div className="attendance-card">

        <div className="attendance-card-header">

          <div>

            <h3>
              {subject}
            </h3>

            <p>
              {section} • {date}
            </p>

          </div>

          <span>
            {presentCount}/
            {students.length}{" "}
            Present
          </span>

        </div>

        {loading ? (
          <div className="no-students">
            <p>
              Loading students...
            </p>
          </div>
        ) : students.length === 0 ? (
          <div className="no-students">

            <p>
              No students found in
              this section.
            </p>

            <button
              onClick={() =>
                navigate(
                  "/students"
                )
              }
            >
              Add Students
            </button>

          </div>
        ) : (
          <div className="student-table">

            <div className="student-header">

              <span>
                Roll No.
              </span>

              <span>
                Student Name
              </span>

              <span>
                Status
              </span>

            </div>

            {students.map(
              (student) => {
                const roll =
                  String(
                    student.roll_no
                  );

                return (
                  <div
                    className="student-row"
                    key={
                      student.id
                    }
                  >

                    <span>
                      {
                        student.roll_no
                      }
                    </span>

                    <strong>
                      {
                        student.name
                      }
                    </strong>

                    <button
                      className={
                        attendance[
                          roll
                        ]
                          ? "status-present"
                          : "status-absent"
                      }
                      onClick={() =>
                        toggleAttendance(
                          roll
                        )
                      }
                    >

                      {attendance[
                        roll
                      ] ? (
                        <>
                          <Check
                            size={17}
                          />
                          Present
                        </>
                      ) : (
                        <>
                          <X
                            size={17}
                          />
                          Absent
                        </>
                      )}

                    </button>

                  </div>
                );
              }
            )}

          </div>
        )}

        <div className="save-area">

          {saved && (
            <span className="saved-message">
              Attendance saved successfully
            </span>
          )}

          <button
            className="save-button"
            onClick={
              saveAttendance
            }
            disabled={
              students.length === 0 ||
              saving ||
              loading
            }
          >
            <Save size={18} />

            {saving
              ? "Saving..."
              : "Save Attendance"}
          </button>

        </div>

      </div>

    </div>
  );
}

export default Attendance;