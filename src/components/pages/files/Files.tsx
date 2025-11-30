import React, { useState } from 'react';
import { MdUploadFile, MdDelete, MdDownload } from 'react-icons/md';
import './Files.scss';
import { supabase } from '../../../lib/supabaseClient';

type FileItem = {
    name: string;
    size: number;
    created: string;
    url: string;
};

const Files: React.FC = () => {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState('');

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setFeedback('Uploading...');

        try {
            const fileName = `${Date.now()}-${file.name}`;
            const { error } = await supabase.storage.from('documents').upload(fileName, file);

            if (error) {
                setFeedback(`Upload failed: ${error.message}`);
            } else {
                setFeedback('File uploaded successfully!');
                // Reset input
                event.target.value = '';
                // Reload files list
                await loadFiles();
            }
        } catch (err) {
            setFeedback('Error uploading file.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadFiles = async () => {
        try {
            const { data, error } = await supabase.storage.from('documents').list();
            if (error) {
                setFeedback(`Error loading files: ${error.message}`);
                return;
            }

            const fileList: FileItem[] = data.map((file) => ({
                name: file.name,
                size: file.metadata?.size || 0,
                created: new Date(file.created_at).toLocaleDateString(),
                url: '',
            }));

            setFiles(fileList);
        } catch (err) {
            setFeedback('Error loading files.');
            console.error(err);
        }
    };

    const handleDelete = async (fileName: string) => {
        if (!confirm(`Delete "${fileName}"?`)) return;

        setLoading(true);
        try {
            const { error } = await supabase.storage.from('documents').remove([fileName]);
            if (error) {
                setFeedback(`Delete failed: ${error.message}`);
            } else {
                setFeedback('File deleted successfully!');
                await loadFiles();
            }
        } catch (err) {
            setFeedback('Error deleting file.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (fileName: string) => {
        try {
            const { data, error } = await supabase.storage
                .from('documents')
                .download(fileName);

            if (error) {
                setFeedback(`Download failed: ${error.message}`);
                return;
            }

            const url = URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            setFeedback('Error downloading file.');
            console.error(err);
        }
    };

    React.useEffect(() => {
        loadFiles();
    }, []);

    return (
        <div className="files-page">
            <header className="files-header">
                <h1>Files</h1>
                <label className="upload-button">
                    <MdUploadFile />
                    <span>Upload</span>
                    <input
                        type="file"
                        onChange={handleFileUpload}
                        disabled={loading}
                        style={{ display: 'none' }}
                    />
                </label>
            </header>

            {feedback && <div className="feedback-message">{feedback}</div>}

            <div className="files-list">
                {files.length === 0 ? (
                    <p className="empty-state">No files uploaded yet.</p>
                ) : (
                    <table className="files-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Size</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {files.map((file) => (
                                <tr key={file.name}>
                                    <td>{file.name}</td>
                                    <td>{(file.size / 1024).toFixed(2)} KB</td>
                                    <td>{file.created}</td>
                                    <td className="actions">
                                        <button
                                            className="action-btn download"
                                            onClick={() => handleDownload(file.name)}
                                            title="Download"
                                        >
                                            <MdDownload />
                                        </button>
                                        <button
                                            className="action-btn delete"
                                            onClick={() => handleDelete(file.name)}
                                            title="Delete"
                                        >
                                            <MdDelete />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default Files;