import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchClasses } from '../../store/slices/classSlice';
import { fetchStudents } from '../../store/slices/studentSlice';
import { reportAPI } from '../../api';
import toast from 'react-hot-toast';

export default function IDCardPage() {
  const dispatch = useDispatch();
  const { list: classes } = useSelector(s => s.classes);
  const { list: students, loading: studentsLoading } = useSelector(s => s.students);
  const { school } = useSelector(s => s.auth);

  const [classId,  setClassId]  = useState('');
  const [section,  setSection]  = useState('');
  const [mode,     setMode]     = useState('class');   // 'class' | 'select'
  const [selected, setSelected] = useState(new Set());
  const [generating, setGenerating] = useState(false);
  const [previewStudents, setPreviewStudents] = useState([]);

  useEffect(() => { dispatch(fetchClasses({})); }, [dispatch]);

  const loadStudents = useCallback(() => {
    if (!classId) return;
    const params = { classId, status: 'active', limit: 200 };
    if (section) params.section = section;
    if (school?.currentAcademicYear) params.academicYear = school.currentAcademicYear;
    dispatch(fetchStudents(params));
    setSelected(new Set());
  }, [classId, section, school, dispatch]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  useEffect(() => {
    if (students) setPreviewStudents(students);
  }, [students]);

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === previewStudents.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(previewStudents.map(s => s._id)));
    }
  };

  const handleGenerate = async () => {
    if (mode === 'class' && !classId) {
      toast.error('Please select a class first');
      return;
    }
    if (mode === 'select' && selected.size === 0) {
      toast.error('Please select at least one student');
      return;
    }

    setGenerating(true);
    try {
      let params = {};
      if (mode === 'class') {
        params = { classId, section: section || undefined, academicYear: school?.currentAcademicYear };
      } else {
        params = { studentIds: Array.from(selected).join(',') };
      }

      const { data } = await reportAPI.getIDCards(params);
      const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      const className = classes.find(c => c._id === classId)?.name || 'students';
      a.href = url;
      a.download = `ID-Cards-${className}${section ? '-' + section : ''}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const count = mode === 'select' ? selected.size : previewStudents.length;
      toast.success(`✅ Generated ${count} ID card${count !== 1 ? 's' : ''}!`);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to generate ID cards';
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  const sections = [...new Set(previewStudents.map(s => s.section).filter(Boolean))].sort();
  const selectedClass = classes.find(c => c._id === classId);
  const cardCount = mode === 'class' ? previewStudents.length : selected.size;

  return (
    <div className="idcard-page-wrap" style={{ maxWidth: 900, margin: '0 auto' }}>
      <style>{`
        .idcard-page-wrap { padding: 24px; }
        .idcard-grid { display: grid; grid-template-columns: 1fr 340px; gap: 20px; align-items: start; }
        .idcard-sidebar { position: sticky; top: 20px; }
        @media (max-width: 768px) {
          .idcard-page-wrap { padding: 12px; }
          .idcard-grid { grid-template-columns: 1fr; gap: 16px; }
          .idcard-sidebar { position: static; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
      {/* Page Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 10, background: 'linear-gradient(135deg,#1a56db,#1e40af)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#fff', flexShrink: 0
          }}>🪪</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111' }}>Student ID Card Generator</h1>
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
              Generate print-ready ID cards with photo, blood group, QR code & school details
            </p>
          </div>
        </div>
      </div>

      <div className="idcard-grid">

        {/* Left: Configuration */}
        <div>
          {/* Mode toggle */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12 }}>Generation Mode</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {[['class', '🏛️ Entire Class', 'Generate for all students in a class'],
                ['select', '✅ Select Students', 'Hand-pick specific students']].map(([val, label, desc]) => (
                <button key={val} onClick={() => setMode(val)} style={{
                  flex: 1, padding: '10px 14px', border: `2px solid ${mode === val ? '#1a56db' : '#e5e7eb'}`,
                  borderRadius: 8, background: mode === val ? '#eff6ff' : '#fff',
                  cursor: 'pointer', textAlign: 'left', transition: 'all .15s'
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: mode === val ? '#1a56db' : '#374151' }}>{label}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 14 }}>Filters</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>
                  Class <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select value={classId} onChange={e => { setClassId(e.target.value); setSection(''); }}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13, background: '#fff' }}>
                  <option value="">Select class</option>
                  {classes.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>Section</label>
                <select value={section} onChange={e => setSection(e.target.value)}
                  disabled={!classId}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13, background: '#fff' }}>
                  <option value="">All Sections</option>
                  {sections.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Student List (for select mode) */}
          {classId && previewStudents.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              <div style={{
                padding: '12px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                  Students in {selectedClass?.name}{section ? ` - ${section}` : ''}
                  <span style={{ marginLeft: 8, fontSize: 12, color: '#6b7280', fontWeight: 400 }}>
                    ({previewStudents.length} students)
                  </span>
                </span>
                {mode === 'select' && (
                  <button onClick={toggleAll} style={{
                    fontSize: 12, color: '#1a56db', background: 'none', border: 'none',
                    cursor: 'pointer', fontWeight: 500
                  }}>
                    {selected.size === previewStudents.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>

              <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                {studentsLoading ? (
                  <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Loading students…</div>
                ) : (
                  previewStudents.map((s, i) => {
                    const isSelected = selected.has(s._id);
                    const fullName = `${s.firstName} ${s.lastName || ''}`.trim();
                    return (
                      <div key={s._id}
                        onClick={() => mode === 'select' && toggleSelect(s._id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                          borderBottom: i < previewStudents.length - 1 ? '1px solid #f3f4f6' : 'none',
                          cursor: mode === 'select' ? 'pointer' : 'default',
                          background: mode === 'select' && isSelected ? '#eff6ff' : '#fff',
                          transition: 'background .12s'
                        }}>
                        {mode === 'select' && (
                          <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(s._id)}
                            style={{ width: 15, height: 15, accentColor: '#1a56db', cursor: 'pointer' }} />
                        )}
                        {/* Avatar */}
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                          background: '#e8f0fe', border: '1.5px solid #c7d7fd', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {s.photo?.url
                            ? <img src={s.photo.url} alt={fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ fontSize: 16 }}>👤</span>
                          }
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fullName}</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>
                            {s.admissionNumber} {s.rollNumber ? `· Roll ${s.rollNumber}` : ''}
                          </div>
                        </div>
                        {s.bloodGroup && s.bloodGroup !== 'Unknown' && (
                          <span style={{
                            fontSize: 10, padding: '2px 6px', borderRadius: 20,
                            background: '#fee2e2', color: '#dc2626', fontWeight: 700
                          }}>{s.bloodGroup}</span>
                        )}
                        {!s.photo?.url && (
                          <span title="No photo" style={{ fontSize: 14 }}>⚠️</span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {classId && !studentsLoading && previewStudents.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb' }}>
              No active students found for this selection.
            </div>
          )}
        </div>

        {/* Right: Preview + Generate */}
        <div className="idcard-sidebar">
          {/* Card Preview */}
          <div style={{
            background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
            padding: 20, marginBottom: 16
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 14 }}>Card Preview</div>

            {/* Mini card mockup */}
            <div style={{
              width: '100%', borderRadius: 8, overflow: 'hidden',
              border: '2px solid #1a56db', boxShadow: '0 4px 12px rgba(26,86,219,.15)'
            }}>
              {/* Header */}
              <div style={{ background: '#1a56db', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: 4, background: 'rgba(255,255,255,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize: 14 }}>
                  {school?.logo?.url
                    ? <img src={school.logo.url} alt="" style={{ width: 20, height: 20, objectFit: 'contain', borderRadius: 3 }} />
                    : '🏫'}
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{school?.name || 'School Name'}</div>
                  <div style={{ fontSize: 8, color: '#a5c8ff' }}>STUDENT IDENTITY CARD</div>
                </div>
              </div>
              {/* Body */}
              <div style={{ padding: '10px', display: 'flex', gap: 10, background: '#fff' }}>
                <div style={{ width: 46, flexShrink: 0 }}>
                  <div style={{ height: 56, background: '#f0f4ff', borderRadius: 4, border: '1px solid #c7d7fd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>👤</div>
                  <div style={{ background: '#dc2626', borderRadius: '0 0 3px 3px', padding: '2px 0', textAlign: 'center', fontSize: 8, color: '#fff', fontWeight: 700 }}>A+</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#1a56db', marginBottom: 6 }}>Student Name</div>
                  {[['ID', 'ADM240001'], ['Class', selectedClass?.name || '—'], ['Roll', '01']].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', gap: 4, marginBottom: 2 }}>
                      <span style={{ fontSize: 8.5, color: '#888', width: 22 }}>{k}:</span>
                      <span style={{ fontSize: 8.5, fontWeight: 600, color: '#111' }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ width: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{
                    width: 30, height: 30, border: '1px solid #ccc', borderRadius: 3,
                    display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gridTemplateRows: 'repeat(5, 1fr)',
                    overflow: 'hidden', gap: 0
                  }}>
                    {Array.from({ length: 25 }).map((_, i) => (
                      <div key={i} style={{ background: [0,1,5,6,10,12,14,18,20,24].includes(i) ? '#333' : '#fff' }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 6, color: '#888', marginTop: 2 }}>QR Code</div>
                </div>
              </div>
              {/* Footer */}
              <div style={{ background: '#f0f4ff', padding: '4px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 8, color: '#1a56db' }}>{school?.phone || school?.email || 'School Contact'}</div>
              </div>
            </div>

            <div style={{ marginTop: 12, fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>
              CR80 standard · 4 cards per A4 page · Print-ready PDF
            </div>
          </div>

          {/* Stats */}
          {classId && (
            <div style={{
              background: '#f0f7ff', border: '1px solid #c7d7fd', borderRadius: 10,
              padding: '12px 16px', marginBottom: 16
            }}>
              <div style={{ fontSize: 12, color: '#1a56db', fontWeight: 600, marginBottom: 8 }}>Generation Summary</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {[
                  ['Cards to generate', cardCount],
                  ['Pages required', Math.ceil(cardCount / 6)],
                  ['Class', selectedClass?.name || '—'],
                  ...(section ? [['Section', section]] : []),
                  ['Students without photo', previewStudents.filter(s => !s.photo?.url).length],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#374151' }}>{label}</span>
                    <span style={{ fontWeight: 700, color: '#111' }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warning for students without photos */}
          {previewStudents.filter(s => !s.photo?.url).length > 0 && classId && (
            <div style={{
              background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8,
              padding: '10px 12px', marginBottom: 16, fontSize: 12, color: '#92400e'
            }}>
              ⚠️ {previewStudents.filter(s => !s.photo?.url).length} student(s) have no photo uploaded. Cards will show a placeholder icon.
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={generating || !classId || (mode === 'select' && selected.size === 0)}
            style={{
              width: '100%', padding: '13px 0', borderRadius: 9, border: 'none',
              background: generating || !classId || (mode === 'select' && selected.size === 0)
                ? '#e5e7eb' : 'linear-gradient(135deg, #1a56db, #1e40af)',
              color: generating || !classId || (mode === 'select' && selected.size === 0) ? '#9ca3af' : '#fff',
              fontWeight: 700, fontSize: 14, cursor:
                generating || !classId || (mode === 'select' && selected.size === 0) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all .15s', boxShadow: !classId ? 'none' : '0 2px 8px rgba(26,86,219,.3)'
            }}>
            {generating ? (
              <>
                <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', fontSize: 16 }}>⏳</span>
                Generating PDF…
              </>
            ) : (
              <>
                🪪 Generate {cardCount > 0 ? `${cardCount} ` : ''}ID Card{cardCount !== 1 ? 's' : ''}
              </>
            )}
          </button>

          <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 10 }}>
            PDF will download automatically
          </p>
        </div>
      </div>
    </div>
  );
}
