import React, { useState, useEffect } from 'react';
import { 
  FolderOpen, 
  Image, 
  CheckCircle, 
  Clock, 
  ArrowRight,
  Users,
  Upload,
  Tag
} from 'lucide-react';
import { projectAPI, collaborationAPI } from '../lib/api';
import useAuthStore from '../store/authStore';
import { cn, formatDate } from '../lib/utils';

export default function Dashboard() {
  const { user } = useAuthStore();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [projectsRes, tasksRes] = await Promise.all([
        projectAPI.list(),
        collaborationAPI.listTasks()
      ]);
      setProjects(projectsRes.data.projects || []);
      setTasks(tasksRes.data.tasks || []);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { label: '项目总数', value: projects.length, icon: FolderOpen, color: 'bg-blue-500' },
    { label: '待处理任务', value: tasks.filter(t => t.status === 'pending').length, icon: Clock, color: 'bg-yellow-500' },
    { label: '已完成任务', value: tasks.filter(t => t.status === 'completed').length, icon: CheckCircle, color: 'bg-green-500' },
    { label: '团队成员', value: projects.reduce((acc, p) => acc + (p.member_count || 0), 0), icon: Users, color: 'bg-purple-500' }
  ];

  const pendingTasks = tasks.filter(t => t.status === 'pending').slice(0, 5);
  const recentProjects = projects.slice(0, 4);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">欢迎回来，{user?.username}！</h1>
        <p className="text-gray-500 mt-1">今天继续标注，让我们一起完成更多工作</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", stat.color)}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">最近项目</h2>
              <button className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1">
                查看全部 <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6">
              {loading ? (
                <div className="text-center py-8 text-gray-500">加载中...</div>
              ) : recentProjects.length === 0 ? (
                <div className="text-center py-12">
                  <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">还没有项目，创建一个开始吧</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recentProjects.map((project) => (
                    <div 
                      key={project.id} 
                      className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50/30 transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{project.name}</h3>
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{project.description || '暂无描述'}</p>
                        </div>
                        <Tag className="w-5 h-5 text-gray-400" />
                      </div>
                      <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Image className="w-4 h-4" />
                          {project.dataset_count || 0} 个数据集
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {project.member_count || 0} 成员
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-3">更新于 {formatDate(project.updated_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">待处理任务</h2>
              <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded-full">
                {pendingTasks.length} 个
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {pendingTasks.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">没有待处理任务</p>
                </div>
              ) : (
                pendingTasks.map((task) => (
                  <div key={task.id} className="p-4 hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{task.image_name}</p>
                        <p className="text-sm text-gray-500 truncate">{task.project_name}</p>
                      </div>
                      <span className="text-xs text-gray-400">{formatDate(task.created_at)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl p-6 text-white">
            <Upload className="w-8 h-8 mb-4" />
            <h3 className="font-semibold text-lg">上传图像</h3>
            <p className="text-sm text-primary-100 mt-2">
              快速上传图像到数据集，开始标注工作
            </p>
            <button className="mt-4 bg-white text-primary-700 px-4 py-2 rounded-lg font-medium text-sm hover:bg-primary-50 transition-colors">
              开始上传
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
