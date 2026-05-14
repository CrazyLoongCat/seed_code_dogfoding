import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export const ROLES = {
  admin: { label: '管理员', color: 'bg-red-100 text-red-800' },
  project_manager: { label: '项目经理', color: 'bg-orange-100 text-orange-800' },
  reviewer: { label: '审核员', color: 'bg-purple-100 text-purple-800' },
  annotator: { label: '标注员', color: 'bg-blue-100 text-blue-800' }
};

export const STATUS_COLORS = {
  unannotated: 'bg-gray-100 text-gray-800',
  annotated: 'bg-blue-100 text-blue-800',
  reviewed: 'bg-green-100 text-green-800'
};

export const ANNOTATION_TYPES = [
  { value: 'object_detection', label: '目标检测 (Bounding Box)' },
  { value: 'instance_segmentation', label: '实例分割 (Polygon)' },
  { value: 'semantic_segmentation', label: '语义分割' },
  { value: 'image_classification', label: '图像分类' },
  { value: 'keypoint_detection', label: '关键点检测' },
  { value: 'ocr', label: '文字识别 (OCR)' }
];
