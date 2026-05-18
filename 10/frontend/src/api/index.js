import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
})

export const packetApi = {
  getList(params) {
    return api.get('/packets', { params })
  },
  getDetail(id) {
    return api.get(`/packets/${id}`)
  },
  delete(id) {
    return api.delete(`/packets/${id}`)
  },
  deleteBatch(ids) {
    return api.delete('/packets', { data: { ids } })
  },
  deleteAll() {
    return api.delete('/packets')
  },
  updateTags(id, tags) {
    return api.put(`/packets/${id}/tags`, { tags })
  },
  export(ids, format) {
    const params = {}
    if (ids && ids.length > 0) {
      params.ids = ids.join(',')
    }
    if (format) {
      params.format = format
    }
    return api.get('/packets/export', {
      params,
      responseType: 'blob'
    })
  },
  toggleStar(id) {
    return api.put(`/packets/${id}/star`)
  },
  replay(id) {
    return api.post('/packets/replay', { id })
  }
}

export const importApi = {
  importFile(file) {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  }
}

export const configApi = {
  getAll() {
    return api.get('/config')
  },
  update(data) {
    return api.put('/config', data)
  }
}

export const statsApi = {
  getStats() {
    return api.get('/stats')
  }
}

export default api
