class SwipeNavigation {
    constructor() {
        this.startX = 0;
        this.startY = 0;
        this.currentX = 0;
        this.currentY = 0;
        this.isDragging = false;
        this.tabOrder = ['dashboard', 'record', 'history', 'condition', 'ai-coach'];
        this.currentTabIndex = 0;

        this.minSwipeDistance = 50;
        this.maxVerticalDeviation = 100;

        this.setupListeners();
    }

    setupListeners() {
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) return;

        mainContent.addEventListener('touchstart', (e) => this.onTouchStart(e), false);
        mainContent.addEventListener('touchmove', (e) => this.onTouchMove(e), false);
        mainContent.addEventListener('touchend', (e) => this.onTouchEnd(e), false);

        mainContent.addEventListener('mousedown', (e) => this.onMouseDown(e), false);
        mainContent.addEventListener('mousemove', (e) => this.onMouseMove(e), false);
        mainContent.addEventListener('mouseup', (e) => this.onMouseUp(e), false);
    }

    onTouchStart(e) {
        this.startX = e.touches[0].clientX;
        this.startY = e.touches[0].clientY;
        this.isDragging = true;
    }

    onTouchMove(e) {
        if (!this.isDragging) return;
        this.currentX = e.touches[0].clientX;
        this.currentY = e.touches[0].clientY;
    }

    onTouchEnd(e) {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.handleSwipe();
    }

    onMouseDown(e) {
        if (e.button !== 0) return;
        this.startX = e.clientX;
        this.startY = e.clientY;
        this.isDragging = true;
    }

    onMouseMove(e) {
        if (!this.isDragging) return;
        this.currentX = e.clientX;
        this.currentY = e.clientY;
    }

    onMouseUp(e) {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.handleSwipe();
    }

    handleSwipe() {
        const deltaX = this.startX - this.currentX;
        const deltaY = Math.abs(this.startY - this.currentY);

        if (Math.abs(deltaX) < this.minSwipeDistance) return;
        if (deltaY > this.maxVerticalDeviation) return;

        if (deltaX > 0) {
            this.swipeLeft();
        } else {
            this.swipeRight();
        }
    }

    swipeLeft() {
        if (this.currentTabIndex < this.tabOrder.length - 1) {
            this.currentTabIndex++;
            const tabName = this.tabOrder[this.currentTabIndex];
            if (window.switchTab) window.switchTab(tabName);
        }
    }

    swipeRight() {
        if (this.currentTabIndex > 0) {
            this.currentTabIndex--;
            const tabName = this.tabOrder[this.currentTabIndex];
            if (window.switchTab) window.switchTab(tabName);
        }
    }

    syncCurrentTab(tabName) {
        this.currentTabIndex = this.tabOrder.indexOf(tabName);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.swipeNav = new SwipeNavigation();
});
