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

    const bucketName = import.meta.env.VITE_SUPABASE_BUCKET as string;
    const userId = '54c89074-f0e7-48fc-a158-da7d75e47a9d';

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setFeedback('Uploading...');

        try {
            const filePath = `${userId}/${Date.now()}-${file.name}`;
            console.log(file)
            const { error } = await supabase.storage
                .from(bucketName)
                .upload(filePath, file);

            if (error) {
                setFeedback(`Upload failed: ${error.message}`);
                console.error('Upload error:', error);
            } else {
                setFeedback('File uploaded successfully! Loading files...');
                event.target.value = '';

                // Wait 1 second for metadata to sync, then reload
                await new Promise(resolve => setTimeout(resolve, 1000));
                await loadFiles();
            }
        } catch (err) {
            setFeedback('Error uploading file.');
            console.error('Upload exception:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadFiles = async () => {
        try {
            const { data, error } = await supabase.storage
                .from(bucketName)
                .list(userId, {
                    limit: 100,
                    offset: 0,
                    sortBy: { column: 'created_at', order: 'desc' },
                });

            if (error) {
                setFeedback(`Error loading files: ${error.message}`);
                console.error('List error:', error);
                return;
            }

            // Filter out directories, keep only files
            const fileList: FileItem[] = data
                .filter((item) => item.id) // Only items with id are files
                .map((file) => ({
                    name: file.name,
                    size: file.metadata?.size || 0,
                    created: new Date(file.created_at).toLocaleDateString(),
                    url: '',
                }));

            setFiles(fileList);

            if (fileList.length === 0) {
                setFeedback('No files found in your directory.');
            }
        } catch (err) {
            setFeedback('Error loading files.');
            console.error('Load exception:', err);
        }
    };

    const handleDelete = async (fileName: string) => {
        if (!confirm(`Delete "${fileName}"?`)) return;

        setLoading(true);
        try {
            const filePath = `${userId}/${fileName}`;
            const { error } = await supabase.storage
                .from(bucketName)
                .remove([filePath]);

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
            const filePath = `${userId}/${fileName}`;
            const { data, error } = await supabase.storage
                .from(bucketName)
                .download(filePath);

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
                                <tr key={file.name.split('-')[1]}>
                                    <td>{file.name.split('-')[1]}</td>
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