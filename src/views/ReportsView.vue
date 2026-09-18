<script setup>
import { ref } from 'vue'
import { useReports } from '../composables/useReports'
import {
  CheckCircleFilled,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleFilled,
  EyeOutlined,
  FileSearchOutlined,
  FilterOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  EnvironmentOutlined,
  PictureOutlined,
  UploadOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons-vue'

const {
  searchText,
  statusFilter,
  severityFilter,
  activeStat,
  currentPage,
  pageSize,
  isModalOpen,
  isEditing,
  editingId,
  isSaving,
  isDetailOpen,
  selectedReport,
  form,
  selectedImageFile,
  imagePreviewUrl,
  handleImageSelected,
  removeAttachedImage,
  filteredReports,
  pagedReports,
  stats,
  t,
  severityLabels,
  statusLabels,
  categoryOptions,
  severityClass,
  statusClass,
  filterByStat,
  resetFilters,
  openCreate,
  openEdit,
  openDetail,
  closeDetail,
  updateStatus,
  saveReport,
  removeReport,
  changePage,
} = useReports()

const fileInputRef = ref(null)

function triggerFileInput() {
  if (fileInputRef.value) {
    fileInputRef.value.click()
  }
}

function onFileChange(e) {
  const file = e.target.files && e.target.files[0]
  if (file) {
    handleImageSelected(file)
  }
}

function onFileDrop(e) {
  const file = e.dataTransfer.files && e.dataTransfer.files[0]
  if (file && file.type.startsWith('image/')) {
    handleImageSelected(file)
  }
}
</script>

<template>
  <div class="reports-page">
    <!-- Page Heading -->
    <div class="page-heading animate-in">
      <div>
        <div class="eyebrow">
          <span>●</span> {{ t('eyebrow') }}
        </div>
        <h1>{{ t('title') }} <span class="accent-star">✦</span></h1>
        <p>{{ t('subtitle') }}</p>
      </div>
      <a-button type="primary" size="large" class="create-btn" @click="openCreate">
        <PlusOutlined /> {{ t('createNew') }}
      </a-button>
    </div>

    <!-- Stats Grid (Clickable to Filter) -->
    <div class="stats-grid">
      <div
        class="stat-card stat-total animate-in stagger-1"
        :class="{ 'active-stat': activeStat === 'all' }"
        :title="t('filterAll')"
        @click="filterByStat('all')"
      >
        <div class="stat-top">
          <span>{{ t('totalReports') }}</span>
          <div class="stat-icon"><FileSearchOutlined /></div>
        </div>
        <strong>{{ stats.total }}</strong>
        <div class="stat-foot">
          <span class="trend-up">100%</span> {{ t('totalFoot') }}
        </div>
      </div>

      <div
        class="stat-card stat-warn animate-in stagger-2"
        :class="{ 'active-stat': activeStat === 'attention' }"
        :title="t('attentionNeeded')"
        @click="filterByStat('attention')"
      >
        <div class="stat-top">
          <span>{{ t('attentionNeeded') }}</span>
          <div class="stat-icon orange"><ExclamationCircleFilled /></div>
        </div>
        <strong>{{ stats.open + stats.investigating }}</strong>
        <div class="stat-foot">
          <span class="trend-warn">{{ t('highPriority') }}</span> {{ t('attentionFoot') }}
        </div>
      </div>

      <div
        class="stat-card stat-investigating animate-in stagger-3"
        :class="{ 'active-stat': activeStat === 'investigating' }"
        :title="t('investigating')"
        @click="filterByStat('investigating')"
      >
        <div class="stat-top">
          <span>{{ t('investigating') }}</span>
          <div class="stat-icon blue"><SearchOutlined /></div>
        </div>
        <strong>{{ stats.investigating }}</strong>
        <div class="stat-foot">
          <span class="trend-neutral">{{ stats.total ? Math.round((stats.investigating / stats.total) * 100) : 0 }}%</span> {{ t('investigatingFoot') }}
        </div>
      </div>

      <div
        class="stat-card stat-resolved animate-in stagger-4"
        :class="{ 'active-stat': activeStat === 'resolved' }"
        :title="t('resolved')"
        @click="filterByStat('resolved')"
      >
        <div class="stat-top">
          <span>{{ t('resolved') }}</span>
          <div class="stat-icon green"><CheckCircleFilled /></div>
        </div>
        <strong>{{ stats.resolved }}</strong>
        <div class="stat-foot">
          <span class="trend-up">↗ {{ stats.total ? Math.round((stats.resolved / stats.total) * 100) : 0 }}%</span> {{ t('resolvedRate') }}
        </div>
      </div>
    </div>

    <!-- Control Bar: Search, Dropdowns & Quick Chips -->
    <div class="control-bar animate-in stagger-5">
      <div class="control-top">
        <div class="search-box">
          <a-input
            v-model:value="searchText"
            allow-clear
            size="large"
            :placeholder="t('searchPlaceholder')"
            @change="currentPage = 1"
          >
            <template #prefix><SearchOutlined /></template>
          </a-input>
        </div>

        <div class="filter-group">
          <a-select
            v-model:value="statusFilter"
            class="filter-select"
            size="large"
            @change="currentPage = 1"
          >
            <template #suffixIcon><FilterOutlined /></template>
            <a-select-option value="all">{{ t('allStatuses') }}</a-select-option>
            <a-select-option value="open">{{ t('statusOpen') }}</a-select-option>
            <a-select-option value="investigating">{{ t('statusInvestigating') }}</a-select-option>
            <a-select-option value="resolved">{{ t('statusResolved') }}</a-select-option>
            <a-select-option value="closed">{{ t('statusClosed') }}</a-select-option>
          </a-select>

          <a-select
            v-model:value="severityFilter"
            class="filter-select"
            size="large"
            @change="currentPage = 1"
          >
            <a-select-option value="all">{{ t('allSeverities') }}</a-select-option>
            <a-select-option value="critical">🔴 {{ t('severityCritical') }}</a-select-option>
            <a-select-option value="high">🟠 {{ t('severityHigh') }}</a-select-option>
            <a-select-option value="medium">🟡 {{ t('severityMedium') }}</a-select-option>
            <a-select-option value="low">🟢 {{ t('severityLow') }}</a-select-option>
          </a-select>

          <a-button class="filter-reset-btn" @click="resetFilters">
            <ReloadOutlined /> {{ t('resetFilter') }}
          </a-button>
        </div>
      </div>

      <!-- Quick Chips -->
      <div class="quick-chips">
        <span class="chip-label">{{ t('quickFilterLabel') }}</span>
        <button
          class="chip-btn"
          :class="{ active: activeStat === 'all' && statusFilter === 'all' && severityFilter === 'all' }"
          @click="resetFilters"
        >
          {{ t('filterAll') }} ({{ stats.total }})
        </button>
        <button
          class="chip-btn"
          :class="{ active: activeStat === 'attention' }"
          @click="filterByStat('attention')"
        >
          {{ t('filterUrgent') }} ({{ stats.open + stats.investigating }})
        </button>
        <button
          class="chip-btn"
          :class="{ active: severityFilter === 'critical' }"
          @click="severityFilter = severityFilter === 'critical' ? 'all' : 'critical'; currentPage = 1"
        >
          {{ t('filterCritical') }} ({{ stats.critical }})
        </button>
        <button
          class="chip-btn"
          :class="{ active: activeStat === 'investigating' }"
          @click="filterByStat('investigating')"
        >
          {{ t('filterInvestigating') }} ({{ stats.investigating }})
        </button>
        <button
          class="chip-btn"
          :class="{ active: activeStat === 'resolved' }"
          @click="filterByStat('resolved')"
        >
          {{ t('filterResolved') }} ({{ stats.resolved }})
        </button>
      </div>
    </div>

    <!-- Data Table (Hiển thị trên Desktop / Tablet >= 768px) -->
    <div class="table-wrap desktop-only animate-in stagger-6">
      <a-table
        :data-source="pagedReports"
        :pagination="false"
        row-key="id"
        :scroll="{ x: 1100 }"
      >
        <!-- Report Column -->
        <a-table-column :title="t('colReport')" key="report" :width="320">
          <template #default="{ record }">
            <div class="report-cell" @click="openDetail(record)">
              <div class="report-title-row">
                <strong>{{ record.title }}</strong>
                <span v-if="record.imageUrl" class="report-img-indicator" :title="t('hasImage')">
                  <PictureOutlined />
                </span>
              </div>
              <div class="report-cell-meta">
                <span class="report-cell-id">{{ record.code || record.id }}</span>
                <span>•</span>
                <span class="report-category">{{ record.category }}</span>
                <span>•</span>
                <span>{{ record.createdAt }}</span>
              </div>
            </div>
          </template>
        </a-table-column>

        <!-- Image Column (Ảnh hiện trường) -->
        <a-table-column :title="t('colImage')" key="image" :width="110" align="center">
          <template #default="{ record }">
            <div class="table-img-cell">
              <div v-if="record.imageUrl" class="table-image-thumb-box" :title="t('viewFullImage')">
                <a-image
                  :src="record.imageUrl"
                  :alt="record.title"
                  class="table-image-thumb"
                />
              </div>
              <div v-else class="table-no-img" :title="t('noImage')">
                <PictureOutlined />
              </div>
            </div>
          </template>
        </a-table-column>

        <!-- Severity Column -->
        <a-table-column :title="t('colSeverity')" key="severity" :width="160">
          <template #default="{ record }">
            <span class="severity-pill" :class="severityClass(record.severity)">
              <i></i>{{ severityLabels[record.severity] }}
            </span>
          </template>
        </a-table-column>

        <!-- Status Column -->
        <a-table-column :title="t('colStatus')" key="status" :width="170">
          <template #default="{ record }">
            <span class="status-pill" :class="statusClass(record.status)">
              {{ statusLabels[record.status] }}
            </span>
          </template>
        </a-table-column>

        <!-- Site Column -->
        <a-table-column :title="t('colSite')" data-index="site" key="site" :width="190">
          <template #default="{ record }">
            <div class="site-cell">
              <EnvironmentOutlined style="color: var(--accent);" />
              {{ record.site }}
            </div>
          </template>
        </a-table-column>

        <!-- Assignee Column -->
        <a-table-column :title="t('colAssignee')" key="assignee" :width="180">
          <template #default="{ record }">
            <div class="assignee">
              <span class="mini-avatar">{{ record.assignee.split(' ').map((part) => part[0]).slice(-2).join('') }}</span>
              {{ record.assignee }}
            </div>
          </template>
        </a-table-column>

        <!-- Action Column -->
        <a-table-column :title="t('colActions')" key="actions" :width="130" align="center" fixed="right">
          <template #default="{ record }">
            <div class="row-actions">
              <button
                type="button"
                class="action-btn"
                :title="t('actionView')"
                @click="openDetail(record)"
              >
                <EyeOutlined />
              </button>
              <button
                type="button"
                class="action-btn"
                :title="t('actionEdit')"
                @click="openEdit(record)"
              >
                <EditOutlined />
              </button>
              <button
                type="button"
                class="action-btn delete-btn"
                :title="t('actionDelete')"
                @click="removeReport(record)"
              >
                <DeleteOutlined />
              </button>
            </div>
          </template>
        </a-table-column>

        <!-- Empty State Slot -->
        <template #emptyText>
          <div class="empty-box">
            <div class="empty-box-icon"><FileSearchOutlined /></div>
            <h3>{{ t('emptyTitle') }}</h3>
            <p>{{ t('emptyDesc') }}</p>
            <a-button type="default" @click="resetFilters">{{ t('resetFilter') }}</a-button>
          </div>
        </template>
      </a-table>

      <!-- Table Footer -->
      <div class="table-footer">
        <span>{{ t('showingCount', { paged: pagedReports.length, total: filteredReports.length }) }}</span>
        <a-pagination
          v-model:current="currentPage"
          :page-size="pageSize"
          :total="filteredReports.length"
          size="default"
          show-less-items
          @change="changePage"
        />
      </div>
    </div>

    <!-- Mobile Card View (Hiển thị mượt mà trên Mobile < 768px) -->
    <div class="mobile-cards-wrap mobile-only animate-in stagger-6">
      <!-- Empty State -->
      <div v-if="filteredReports.length === 0" class="empty-box">
        <div class="empty-box-icon"><FileSearchOutlined /></div>
        <h3>{{ t('emptyTitle') }}</h3>
        <p>{{ t('emptyDesc') }}</p>
        <a-button type="default" @click="resetFilters">{{ t('resetFilter') }}</a-button>
      </div>

      <!-- Card List -->
      <div v-else class="mobile-card-list">
        <div
          v-for="record in pagedReports"
          :key="record.id"
          class="report-mobile-card"
        >
          <!-- Card Header: Code ID + Severity + Status -->
          <div class="mobile-card-header">
            <span class="report-cell-id">{{ record.code || record.id }}</span>
            <div class="mobile-card-pills">
              <span class="severity-pill" :class="severityClass(record.severity)">
                <i></i>{{ severityLabels[record.severity] }}
              </span>
              <span class="status-pill" :class="statusClass(record.status)">
                {{ statusLabels[record.status] }}
              </span>
            </div>
          </div>

          <!-- Card Body: Title + Category -->
          <div class="mobile-card-body" @click="openDetail(record)">
            <div class="mobile-card-content">
              <h3 class="mobile-card-title">{{ record.title }}</h3>
              <div class="mobile-card-cat-badge">
                <span>{{ record.category }}</span>
              </div>
            </div>
          </div>

          <!-- Prominent Incident Photo Banner (Hiển thị to rõ trên Mobile khi có ảnh) -->
          <div v-if="record.imageUrl" class="mobile-card-photo-banner" @click="openDetail(record)">
            <img :src="record.imageUrl" :alt="record.title" class="mobile-card-banner-img" />
            <div class="mobile-photo-tag">
              <PictureOutlined /> <span>Ảnh hiện trường sự cố</span>
            </div>
          </div>

          <!-- Card Meta: Site + Assignee + Created Date -->
          <div class="mobile-card-meta">
            <div class="mobile-meta-item">
              <EnvironmentOutlined style="color: var(--accent);" />
              <span>{{ record.site }}</span>
            </div>
            <div class="mobile-meta-item">
              <span class="mini-avatar">{{ record.assignee.split(' ').map((part) => part[0]).slice(-2).join('') }}</span>
              <span>{{ record.assignee }}</span>
            </div>
            <div class="mobile-meta-item date-item">
              <span>📅 {{ record.createdAt }}</span>
            </div>
          </div>

          <!-- Card Actions (Thumb-friendly touch targets) -->
          <div class="mobile-card-actions">
            <button
              type="button"
              class="mobile-action-btn view"
              @click="openDetail(record)"
            >
              <EyeOutlined /> <span>{{ t('actionView') }}</span>
            </button>
            <button
              type="button"
              class="mobile-action-btn edit"
              @click="openEdit(record)"
            >
              <EditOutlined /> <span>{{ t('actionEdit') }}</span>
            </button>
            <button
              type="button"
              class="mobile-action-btn delete"
              @click="removeReport(record)"
            >
              <DeleteOutlined /> <span>{{ t('actionDelete') }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Mobile Pagination -->
      <div class="mobile-card-footer">
        <span class="mobile-count-text">{{ t('showingCount', { paged: pagedReports.length, total: filteredReports.length }) }}</span>
        <a-pagination
          v-model:current="currentPage"
          :page-size="pageSize"
          :total="filteredReports.length"
          size="small"
          show-less-items
          @change="changePage"
        />
      </div>
    </div>

    <!-- Modal Xem Chi Tiết Báo Cáo & Cập Nhật Nhanh -->
    <a-modal
      v-model:open="isDetailOpen"
      width="680px"
      class="detail-modal"
      :footer="null"
      @cancel="closeDetail"
    >
      <div v-if="selectedReport" class="detail-content">
        <div class="detail-header">
          <div class="detail-badge-row">
            <span class="report-cell-id">{{ selectedReport.id }}</span>
            <span class="severity-pill" :class="severityClass(selectedReport.severity)">
              <i></i>{{ severityLabels[selectedReport.severity] }}
            </span>
            <span class="status-pill" :class="statusClass(selectedReport.status)">
              {{ statusLabels[selectedReport.status] }}
            </span>
          </div>
          <h2 class="detail-title">{{ selectedReport.title }}</h2>
        </div>

        <div class="detail-desc-box">
          {{ selectedReport.description }}
        </div>

        <!-- Image display in detail modal if present -->
        <div v-if="selectedReport.imageUrl" class="detail-image-box">
          <div class="detail-info-label">{{ t('labelImage') }}</div>
          <div class="detail-image-preview">
            <a-image
              :src="selectedReport.imageUrl"
              :alt="selectedReport.title"
              class="detail-report-img"
            />
          </div>
        </div>

        <div class="detail-info-grid">
          <div class="detail-info-item">
            <div class="detail-info-label">{{ t('detailCategory') }}</div>
            <div class="detail-info-value">{{ selectedReport.category }}</div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-label">{{ t('detailSite') }}</div>
            <div class="detail-info-value">{{ selectedReport.site }}</div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-label">{{ t('detailAssignee') }}</div>
            <div class="detail-info-value">{{ selectedReport.assignee }}</div>
          </div>
          <div class="detail-info-item">
            <div class="detail-info-label">{{ t('detailCreatedAt') }}</div>
            <div class="detail-info-value">{{ selectedReport.createdAt }}</div>
          </div>
        </div>

        <!-- Quick Status Change Action -->
        <div class="detail-status-action">
          <span class="detail-status-label">{{ t('quickStatusUpdate') }}</span>
          <div class="status-btn-group">
            <button
              class="status-btn"
              :class="{ 'active-status-btn': selectedReport.status === 'open' }"
              @click="updateStatus(selectedReport.id, 'open')"
            >
              {{ t('statusOpen') }}
            </button>
            <button
              class="status-btn"
              :class="{ 'active-status-btn': selectedReport.status === 'investigating' }"
              @click="updateStatus(selectedReport.id, 'investigating')"
            >
              {{ t('statusInvestigating') }}
            </button>
            <button
              class="status-btn"
              :class="{ 'active-status-btn': selectedReport.status === 'resolved' }"
              @click="updateStatus(selectedReport.id, 'resolved')"
            >
              {{ t('statusResolved') }}
            </button>
            <button
              class="status-btn"
              :class="{ 'active-status-btn': selectedReport.status === 'closed' }"
              @click="updateStatus(selectedReport.id, 'closed')"
            >
              {{ t('statusClosed') }}
            </button>
          </div>

          <a-button type="primary" style="margin-left: auto;" @click="openEdit(selectedReport)">
            <EditOutlined /> {{ t('editInfo') }}
          </a-button>
        </div>
      </div>
    </a-modal>

    <!-- Modal Tạo / Chỉnh sửa Báo Cáo -->
    <a-modal
      v-model:open="isModalOpen"
      width="640px"
      :title="isEditing ? t('modalEditTitle') : t('modalCreateTitle')"
      :ok-text="isSaving ? 'Đang lưu...' : t('btnSave')"
      :cancel-text="t('btnCancel')"
      :ok-button-props="{ loading: isSaving, disabled: !form.title || !form.site || !form.description }"
      @ok="saveReport"
    >
      <a-form layout="vertical" class="report-form">
        <a-form-item :label="t('labelTitle')" required>
          <a-input
            v-model:value="form.title"
            size="large"
            :placeholder="t('placeholderTitle')"
          />
        </a-form-item>

        <div class="form-grid">
          <a-form-item :label="t('labelCategory')">
            <a-select v-model:value="form.category" size="large">
              <a-select-option
                v-for="cat in categoryOptions"
                :key="cat.value"
                :value="cat.value"
              >
                {{ cat.label }}
              </a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item :label="t('labelSeverity')">
            <a-select v-model:value="form.severity" size="large">
              <a-select-option value="critical">🔴 {{ t('severityCritical') }}</a-select-option>
              <a-select-option value="high">🟠 {{ t('severityHigh') }}</a-select-option>
              <a-select-option value="medium">🟡 {{ t('severityMedium') }}</a-select-option>
              <a-select-option value="low">🟢 {{ t('severityLow') }}</a-select-option>
            </a-select>
          </a-form-item>
        </div>

        <div class="form-grid">
          <a-form-item :label="t('labelSite')" required>
            <a-input
              v-model:value="form.site"
              size="large"
              :placeholder="t('placeholderSite')"
            />
          </a-form-item>

          <a-form-item :label="t('labelAssignee')">
            <a-input
              v-model:value="form.assignee"
              size="large"
              :placeholder="t('placeholderAssignee')"
            />
          </a-form-item>
        </div>

        <a-form-item :label="t('labelStatus')" v-if="isEditing">
          <a-select v-model:value="form.status" size="large">
            <a-select-option value="open">{{ t('statusOpen') }}</a-select-option>
            <a-select-option value="investigating">{{ t('statusInvestigating') }}</a-select-option>
            <a-select-option value="resolved">{{ t('statusResolved') }}</a-select-option>
            <a-select-option value="closed">{{ t('statusClosed') }}</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item :label="t('labelDescription')" required>
          <a-textarea
            v-model:value="form.description"
            :rows="4"
            :placeholder="t('placeholderDescription')"
          />
        </a-form-item>

        <!-- Image Upload Field -->
        <a-form-item :label="t('labelImage')">
          <div class="image-upload-wrapper">
            <input
              type="file"
              ref="fileInputRef"
              accept="image/*"
              style="display: none;"
              @change="onFileChange"
            />

            <!-- Preview if image exists or selected -->
            <div v-if="imagePreviewUrl || form.imageUrl" class="image-preview-card">
              <img :src="imagePreviewUrl || form.imageUrl" alt="Preview" class="upload-thumbnail" />
              <div class="image-preview-meta">
                <span class="preview-filename">{{ selectedImageFile ? selectedImageFile.name : 'Ảnh hiện trường sự cố' }}</span>
                <span v-if="selectedImageFile" class="preview-filesize">{{ (selectedImageFile.size / 1024).toFixed(1) }} KB</span>
              </div>
              <button
                type="button"
                class="remove-image-btn"
                :title="t('removeImage')"
                @click="removeAttachedImage"
              >
                <CloseCircleOutlined /> {{ t('removeImage') }}
              </button>
            </div>

            <!-- Upload drop area if no image -->
            <div
              v-else
              class="upload-dropzone"
              @click="triggerFileInput"
              @dragover.prevent
              @drop.prevent="onFileDrop"
            >
              <UploadOutlined class="upload-icon" />
              <div class="upload-text">{{ t('uploadImagePlaceholder') }}</div>
              <div class="upload-hint">{{ t('imageFormatNotice') }}</div>
            </div>
          </div>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>
