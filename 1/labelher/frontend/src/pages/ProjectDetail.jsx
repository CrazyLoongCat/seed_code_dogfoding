import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Upload, 
  Users, 
  Tag, 
  Image, 
  Trash2, 
  PlusCircle,
  Edit,
  CheckCircle,
  Clock,
  MoreVertical,
  UserPlus,
  X
} from 'lucide-react';
import { projectAPI, datasetAPI, annotationAPI, collaborationAPI, authAPI } from '../lib/api';
import useAuthStore from '../store/authStore';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { STATUS_COLORS, ROLES, formatDate } from '../lib/utils';

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [project, setProject] = useState(null);
  const [stats, setStats] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [classes, setClasses] = useState([]);
  const [members, setMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('datasets');
  const [activeDataset, setActiveDataset] = useState(null);
  const [images, setImages] = useState([]);

  const [showCreateDataset, setShowCreateDataset] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showAddClass, setShowAddClass] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);

  const [formData, setFormData] = useState({
    datasetName: '',
    className: '',
    classColor: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'),
    newMemberId: '',
    newMemberRole: 'annotator'
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState([]);

  useEffect(() => {
    fetchData();
  }, [projectId]);

  useEffect(() => {
    if (activeDataset) {
      fetchImages(activeDataset.id);
    }
  }, [activeDataset]);

  const fetchData = async () => {
    try {
      const [projectRes, datasetsRes, classesRes, membersRes, usersRes] = await Promise.all([
        projectAPI.get(projectId),
        datasetAPI.list(projectId),
        annotationAPI.listClasses(projectId),
        projectAPI.getMembers(projectId),
        authAPI.getUsers()
      ]);
      
      setProject(projectRes.data.project);
      setStats(projectRes.data.stats);
      setDatasets(datasetsRes.data.datasets || []);
      setClasses(classesRes.data.classes || []);
      setMembers(membersRes.data.members || []);
      setAllUsers(usersRes.data.users || []);
    } catch (error) {
      console.error('Failed to fetch project data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchImages = async (datasetId) => {
    try {
      const res = await datasetAPI.listImages(datasetId);
      setImages(res.data.images || []);
    } catch (error) {
      console.error('Failed to fetch images:', error);
    }
  };

  const handleCreateDataset = async (e) => {
    e.preventDefault();
    try {
      await datasetAPI.create(projectId, { 
        name: formData.datasetName 
      });
      setShowCreateDataset(false);
      setFormData({ ...formData, datasetName: '' });
      fetchData();
    } catch (error) {
      console.error('Failed to create dataset:', error);
    }
  };

  const handleUpload = async () => {
    if (!activeDataset || selectedFiles.length === 0) return;
    
    try {
      await datasetAPI.uploadImages(activeDataset.id, selectedFiles, setUploadProgress);
      setShowUpload(false);
      setUploadProgress(0);
      setSelectedFiles([]);
      fetchImages(activeDataset.id);
    } catch (error) {
      console.error('Failed to upload images:', error);
    }
  };

  const handleAddClass = async (e) => {
    e.preventDefault();
    try {
      await annotationAPI.createClass(projectId, {
        name: formData.className,
        color: formData.classColor
      });
      setShowAddClass(false);
      setFormData({ 
        ...formData, 
        className: '', 
        classColor: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')
      });
      fetchData();
    } catch (error) {
      console.error('Failed to add class:', error);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    try {
      await projectAPI.addMember(projectId, {
        user_id: formData.newMemberId,
        role: formData.newMemberRole
      });
      setShowAddMember(false);
      setFormData({ ...formData, newMemberId: '', newMemberRole: 'annotator' });
      fetchData();
    } catch (error) {
      console.error('Failed to add member:', error);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('确定要移除这个成员吗？')) return;
    try {
      await projectAPI.removeMember(projectId, userId);
      fetchData();
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  const handleDeleteDataset = async (datasetId) => {
    if (!window.confirm('确定要删除这个数据集吗？此操作不可恢复。')) return;
    try {
      await datasetAPI.delete(datasetId);
      if (activeDataset?.id === datasetId) {
        setActiveDataset(null);
      }
      fetchData();
    } catch (error) {
      console.error('Failed to delete dataset:', error);
    }
  };

  const handleDeleteClass = async (classId) => {
    if (!window.confirm('确定要删除这个类别吗？')) return;
    try {
      await annotationAPI.deleteClass(classId);
      fetchData();
    } catch (error) {
      console.error('Failed to delete class:', error);
    }
  };

  const canEdit = user.role === 'admin' || user.role === 'project_manager';
  const availableUsers = allUsers.filter(u => 
    !members.some(m => m.id === u.id || m.user_id === u.id)
  );

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        加载中...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">项目不存在</p>
      </div>
    );
  }

  const tabs = [
    { id: 'datasets', label: '数据集', icon: Image },
    { id: 'classes', label: '标注类别', icon: Tag },
    { id: 'members', label: '团队成员', icon: Users }
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
        <p className="text-gray-500 mt-1">{project.description || '暂无描述'}</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Image className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total_images}</p>
                <p className="text-sm text-gray-500">总图片数</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total_images - stats.annotated_images}</p>
                <p className="text-sm text-gray-500">待标注</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Tag className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.annotated_images}</p>
                <p className="text-sm text-gray-500">已标注</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total_annotations}</p>
                <p className="text-sm text-gray-500">标注总数</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    activeTab === tab.id
                      ? "bg-primary-100 text-primary-700"
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'datasets' && (
            <div className="space-y-6">
              {canEdit && (
                <Button onClick={() => setShowCreateDataset(true)}>
                  <Plus className="w-5 h-5" />
                  新建数据集
                </Button>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {datasets.map((dataset) => (
                  <div
                    key={dataset.id}
                    className={cn(
                      "border rounded-xl p-4 cursor-pointer transition-all",
                      activeDataset?.id === dataset.id
                        ? "border-primary-500 bg-primary-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                    onClick={() => setActiveDataset(dataset)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900">{dataset.name}</h3>
                        <p className="text-sm text-gray-500">{dataset.image_count || 0} 张图片</p>
                      </div>
                      {canEdit && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDataset(dataset.id);
                          }}
                          className="p-2 hover:bg-red-100 rounded-lg text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {dataset.annotated_count || 0} 已标注
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {(dataset.image_count || 0) - (dataset.annotated_count || 0)} 待标注
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {activeDataset && (
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">{activeDataset.name} - 图片列表</h3>
                    {canEdit && (
                      <Button onClick={() => setShowUpload(true)}>
                        <Upload className="w-5 h-5" />
                        上传图片
                      </Button>
                    )}
                  </div>

                  {images.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl">
                      <Image className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">暂无图片，请上传图片开始标注</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {images.map((image) => (
                        <div
                          key={image.id}
                          onClick={() => navigate(`/annotation/${image.id}`)}
                          className="group relative aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer border border-gray-200 hover:border-primary-500 transition-all"
                        >
                          <img
                            src={`/api/uploads/${image.dataset_id}/${image.filename}`}
                            alt={image.original_name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                          <div className="absolute top-2 left-2">
                            <Badge variant={
                              image.status === 'annotated' ? 'primary' :
                              image.status === 'reviewed' ? 'success' : 'default'
                            }>
                              {image.status === 'unannotated' ? '待标注' :
                               image.status === 'annotated' ? '已标注' : '已审核'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'classes' && (
            <div className="space-y-4">
              {canEdit && (
                <Button onClick={() => setShowAddClass(true)}>
                  <PlusCircle className="w-5 h-5" />
                  添加类别
                </Button>
              )}

              {classes.length === 0 ? (
                <div className="text-center py-12">
                  <Tag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">还没有标注类别，添加一些开始标注吧</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {classes.map((cls) => (
                    <div
                      key={cls.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-6 h-6 rounded"
                          style={{ backgroundColor: cls.color }}
                        />
                        <span className="font-medium text-gray-900">{cls.name}</span>
                      </div>
                      {canEdit && (
                        <button
                          onClick={() => handleDeleteClass(cls.id)}
                          className="p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'members' && (
            <div className="space-y-4">
              {canEdit && (
                <Button onClick={() => setShowAddMember(true)}>
                  <UserPlus className="w-5 h-5" />
                  添加成员
                </Button>
              )}

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">成员</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">邮箱</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">角色</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">加入时间</th>
                      {canEdit && <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">操作</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-primary-600">
                                {member.username[0].toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium text-gray-900">
                              {member.username}
                              {member.is_owner && <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">所有者</span>}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{member.email}</td>
                        <td className="py-3 px-4">
                          <span className={cn("text-xs px-2 py-1 rounded", ROLES[member.role]?.color)}>
                            {ROLES[member.role]?.label || member.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-600 text-sm">
                          {member.joined_at ? formatDate(member.joined_at) : '-'}
                        </td>
                        {canEdit && (
                          <td className="py-3 px-4">
                            {!member.is_owner && (
                              <button
                                onClick={() => handleRemoveMember(member.user_id || member.id)}
                                className="text-red-600 hover:text-red-700 text-sm"
                              >
                                移除
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showCreateDataset}
        onClose={() => setShowCreateDataset(false)}
        title="新建数据集"
      >
        <form onSubmit={handleCreateDataset} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">数据集名称</label>
            <input
              type="text"
              value={formData.datasetName}
              onChange={(e) => setFormData({ ...formData, datasetName: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              placeholder="输入数据集名称"
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowCreateDataset(false)}>
              取消
            </Button>
            <Button type="submit">创建数据集</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        title="上传图片"
      >
        <div className="space-y-4">
          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-primary-500 transition-colors"
            onClick={() => document.getElementById('file-input').click()}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">点击或拖拽图片到此处</p>
            <p className="text-sm text-gray-400">支持 JPG, PNG, GIF, BMP, WebP</p>
            <input
              id="file-input"
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
            />
          </div>

          {selectedFiles.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                已选择 {selectedFiles.length} 个文件
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between text-sm py-2 px-3 bg-gray-50 rounded">
                    <span className="truncate">{file.name}</span>
                    <button
                      onClick={() => setSelectedFiles(selectedFiles.filter((_, i) => i !== index))}
                      className="text-gray-400 hover:text-red-600 ml-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>上传中...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => {
              setShowUpload(false);
              setUploadProgress(0);
              setSelectedFiles([]);
            }}>
              取消
            </Button>
            <Button onClick={handleUpload} disabled={selectedFiles.length === 0 || uploadProgress > 0}>
              开始上传
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showAddClass}
        onClose={() => setShowAddClass(false)}
        title="添加标注类别"
      >
        <form onSubmit={handleAddClass} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">类别名称</label>
            <input
              type="text"
              value={formData.className}
              onChange={(e) => setFormData({ ...formData, className: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              placeholder="输入类别名称"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">颜色</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={formData.classColor}
                onChange={(e) => setFormData({ ...formData, classColor: e.target.value })}
                className="w-12 h-12 border-0 rounded cursor-pointer"
              />
              <input
                type="text"
                value={formData.classColor}
                onChange={(e) => setFormData({ ...formData, classColor: e.target.value })}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none font-mono"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowAddClass(false)}>
              取消
            </Button>
            <Button type="submit">添加类别</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showAddMember}
        onClose={() => setShowAddMember(false)}
        title="添加团队成员"
      >
        <form onSubmit={handleAddMember} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">选择用户</label>
            <select
              value={formData.newMemberId}
              onChange={(e) => setFormData({ ...formData, newMemberId: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              required
            >
              <option value="">请选择用户</option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username} ({u.email})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">角色</label>
            <select
              value={formData.newMemberRole}
              onChange={(e) => setFormData({ ...formData, newMemberRole: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            >
              <option value="annotator">标注员</option>
              <option value="reviewer">审核员</option>
              <option value="project_manager">项目经理</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowAddMember(false)}>
              取消
            </Button>
            <Button type="submit">添加成员</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function cn(...inputs) {
  return inputs.filter(Boolean).join(' ');
}
