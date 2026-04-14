document.addEventListener('DOMContentLoaded', () => {
    // Initialize Supabase
    const supabaseUrl = 'https://elcizzczflunmjuyfhvq.supabase.co';
    const supabaseKey = 'sb_publishable_LRHrxxr8BewhV5VacNfk0w_rBqPCS5S';
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

    const studentListBody = document.getElementById('studentListBody');


    async function loadStudents() {
        try {
            const { data: students, error } = await supabase
                .from('students')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            renderStudents(students);
        } catch (error) {
            console.error('Error loading students:', error);
        }
    }

    function renderStudents(students) {
        studentListBody.innerHTML = '';
        
        students.forEach(student => {
            const tr = document.createElement('tr');
            
            // Format date
            const lastUpdated = student.created_at ? new Date(student.created_at).toLocaleDateString() : 'Never';
            
            tr.innerHTML = `
                <td>
                    <div class="student-info-cell">
                        <div class="student-avatar">${student.name.charAt(0)}</div>
                        <span>${student.name}</span>
                    </div>
                </td>
                <td>${student.course_name || '<span class="text-muted">No course</span>'}</td>
                <td>
                    <span class="status-badge ${getStatusClass(student.current_progress)}">
                        ${student.current_progress || 'New Student'}
                    </span>
                </td>
                <td>${lastUpdated}</td>
                <td>
                    <button class="btn-action" title="View Details">
                        <i class="ph ph-eye"></i>
                    </button>
                    <button class="btn-action delete-student" data-id="${student.id}" title="Delete student">
                        <i class="ph ph-trash"></i>
                    </button>
                </td>
            `;
            
            // Add delete event
            tr.querySelector('.delete-student').addEventListener('click', async () => {
                if (!confirm(`Are you sure you want to delete ${student.name}?`)) return;
                
                const { error } = await supabase
                    .from('students')
                    .delete()
                    .eq('id', student.id);
                    
                if (error) {
                    alert('Failed to delete student.');
                }
                // Realtime or manual removal
            });

            studentListBody.appendChild(tr);
        });
    }

    function getStatusClass(status) {
        if (!status) return 'status-new';
        const s = status.toLowerCase();
        if (s.includes('good') || s.includes('excellent') || s.includes('completed')) return 'status-good';
        if (s.includes('average') || s.includes('progressing')) return 'status-average';
        if (s.includes('needs') || s.includes('struggling') || s.includes('attention')) return 'status-needs';
        return 'status-new';
    }

    // Subscribe to changes
    supabase.channel('student_list_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, payload => {
            loadStudents();
        })
        .subscribe();

    loadStudents();
});
