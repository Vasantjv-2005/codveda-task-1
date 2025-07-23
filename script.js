class GitHubSearchApp {
  constructor() {
      this.currentPage = 1;
      this.currentQuery = '';
      this.currentSort = 'best-match';
      this.currentLanguage = '';
      this.isLoading = false;
      this.debounceTimer = null;
      
      this.initializeElements();
      this.bindEvents();
      this.performInitialSearch();
  }
  
  initializeElements() {
      this.searchInput = document.getElementById('searchInput');
      this.searchBtn = document.getElementById('searchBtn');
      this.sortSelect = document.getElementById('sortSelect');
      this.languageSelect = document.getElementById('languageSelect');
      this.loadingSpinner = document.getElementById('loadingSpinner');
      this.errorMessage = document.getElementById('errorMessage');
      this.errorText = document.getElementById('errorText');
      this.retryBtn = document.getElementById('retryBtn');
      this.repositoriesContainer = document.getElementById('repositoriesContainer');
      this.resultsCount = document.getElementById('resultsCount');
      this.loadMoreContainer = document.getElementById('loadMoreContainer');
      this.loadMoreBtn = document.getElementById('loadMoreBtn');
  }
  
  bindEvents() {
      // Debounced search on input
      this.searchInput.addEventListener('input', (e) => {
          clearTimeout(this.debounceTimer);
          this.debounceTimer = setTimeout(() => {
              this.handleSearch(e.target.value);
          }, 500);
      });
      
      // Search on button click
      this.searchBtn.addEventListener('click', () => {
          this.handleSearch(this.searchInput.value);
      });
      
      // Search on Enter key
      this.searchInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
              clearTimeout(this.debounceTimer);
              this.handleSearch(this.searchInput.value);
          }
      });
      
      // Filter changes
      this.sortSelect.addEventListener('change', () => {
          this.currentSort = this.sortSelect.value;
          this.handleSearch(this.currentQuery, true);
      });
      
      this.languageSelect.addEventListener('change', () => {
          this.currentLanguage = this.languageSelect.value;
          this.handleSearch(this.currentQuery, true);
      });
      
      // Retry button
      this.retryBtn.addEventListener('click', () => {
          this.handleSearch(this.currentQuery, true);
      });
      
      // Load more button
      this.loadMoreBtn.addEventListener('click', () => {
          this.loadMoreRepositories();
      });
  }
  
  async performInitialSearch() {
      await this.handleSearch('javascript', true);
  }
  
  async handleSearch(query, resetPage = false) {
      if (this.isLoading) return;
      
      query = query.trim();
      if (!query) {
          this.repositoriesContainer.innerHTML = '';
          this.hideAllStates();
          return;
      }
      
      if (resetPage) {
          this.currentPage = 1;
          this.repositoriesContainer.innerHTML = '';
      }
      
      this.currentQuery = query;
      this.showLoading();
      
      try {
          const data = await this.fetchRepositories(query, this.currentPage);
          this.hideAllStates();
          
          if (resetPage) {
              this.repositoriesContainer.innerHTML = '';
          }
          
          this.displayRepositories(data.items);
          this.updateResultsInfo(data.total_count);
          this.updateLoadMoreButton(data.items.length);
          
      } catch (error) {
          this.hideAllStates();
          this.showError(error.message);
      }
  }
  
  async fetchRepositories(query, page = 1) {
      this.isLoading = true;
      
      let searchQuery = query;
      if (this.currentLanguage) {
          searchQuery += ` language:${this.currentLanguage}`;
      }
      
      const sortParam = this.getSortParameter();
      const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(searchQuery)}&sort=${sortParam}&order=desc&page=${page}&per_page=12`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
          if (response.status === 403) {
              throw new Error('API rate limit exceeded. Please try again later.');
          } else if (response.status === 422) {
              throw new Error('Invalid search query. Please try different keywords.');
          } else {
              throw new Error(`Failed to fetch repositories: ${response.status}`);
          }
      }
      
      const data = await response.json();
      this.isLoading = false;
      return data;
  }
  
  getSortParameter() {
      const sortMap = {
          'best-match': '',
          'stars': 'stars',
          'forks': 'forks',
          'updated': 'updated'
      };
      return sortMap[this.currentSort] || '';
  }
  
  displayRepositories(repositories) {
      repositories.forEach(repo => {
          const repoCard = this.createRepositoryCard(repo);
          this.repositoriesContainer.appendChild(repoCard);
      });
  }
  
  createRepositoryCard(repo) {
      const card = document.createElement('div');
      card.className = 'repository-card';
      
      const topics = repo.topics ? repo.topics.slice(0, 5) : [];
      const topicsHTML = topics.map(topic => 
          `<span class="topic">${this.escapeHtml(topic)}</span>`
      ).join('');
      
      card.innerHTML = `
          <div class="repo-header">
              <img src="${repo.owner.avatar_url}" alt="${this.escapeHtml(repo.owner.login)}" class="repo-avatar">
              <div class="repo-title">
                  <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer" class="repo-name">
                      ${this.escapeHtml(repo.name)}
                  </a>
                  <div class="repo-owner">by ${this.escapeHtml(repo.owner.login)}</div>
              </div>
          </div>
          
          ${repo.description ? `<p class="repo-description">${this.escapeHtml(repo.description)}</p>` : ''}
          
          <div class="repo-stats">
              <div class="stat">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"></polygon>
                  </svg>
                  ${this.formatNumber(repo.stargazers_count)}
              </div>
              <div class="stat">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="3"></circle>
                      <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"></path>
                  </svg>
                  ${this.formatNumber(repo.forks_count)}
              </div>
              ${repo.language ? `
                  <div class="stat">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="16 18 22 12 16 6"></polyline>
                          <polyline points="8 6 2 12 8 18"></polyline>
                      </svg>
                      ${this.escapeHtml(repo.language)}
                  </div>
              ` : ''}
          </div>
          
          ${topics.length > 0 ? `<div class="repo-topics">${topicsHTML}</div>` : ''}
      `;
      
      return card;
  }
  
  async loadMoreRepositories() {
      if (this.isLoading) return;
      
      this.currentPage++;
      this.loadMoreBtn.textContent = 'Loading...';
      this.loadMoreBtn.disabled = true;
      
      try {
          const data = await this.fetchRepositories(this.currentQuery, this.currentPage);
          this.displayRepositories(data.items);
          this.updateLoadMoreButton(data.items.length);
      } catch (error) {
          this.showError(error.message);
          this.currentPage--; // Revert page increment on error
      }
      
      this.loadMoreBtn.textContent = 'Load More';
      this.loadMoreBtn.disabled = false;
  }
  
  updateResultsInfo(totalCount) {
      if (totalCount > 0) {
          this.resultsCount.textContent = `Found ${this.formatNumber(totalCount)} repositories`;
      } else {
          this.resultsCount.textContent = 'No repositories found';
      }
  }
  
  updateLoadMoreButton(itemsCount) {
      if (itemsCount === 12) { // GitHub API returns max 12 items per page in our request
          this.loadMoreContainer.classList.remove('hidden');
      } else {
          this.loadMoreContainer.classList.add('hidden');
      }
  }
  
  showLoading() {
      this.loadingSpinner.classList.remove('hidden');
      this.errorMessage.classList.add('hidden');
  }
  
  showError(message) {
      this.errorText.textContent = message;
      this.errorMessage.classList.remove('hidden');
      this.loadingSpinner.classList.add('hidden');
  }
  
  hideAllStates() {
      this.loadingSpinner.classList.add('hidden');
      this.errorMessage.classList.add('hidden');
  }
  
  formatNumber(num) {
      if (num >= 1000000) {
          return (num / 1000000).toFixed(1) + 'M';
      } else if (num >= 1000) {
          return (num / 1000).toFixed(1) + 'K';
      }
      return num.toString();
  }
  
  escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new GitHubSearchApp();
});