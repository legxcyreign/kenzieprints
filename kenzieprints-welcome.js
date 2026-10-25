
/* =========================================
   KENZIEPRINTS — SMOOTH PRODUCT CAROUSEL
   ========================================= */

document.addEventListener("DOMContentLoaded", () => {
  const track = document.querySelector(".welcome-slideshow-track");
  const prevButton = document.querySelector(".welcome-slide-prev");
  const nextButton = document.querySelector(".welcome-slide-next");
  const pauseButton = document.querySelector(".welcome-slide-pause");

  if (!track || !prevButton || !nextButton || !pauseButton) {
    return;
  }

  // Remove any previous carousel clones.
  track.querySelectorAll("[data-carousel-clone]").forEach((item) => {
    item.remove();
  });

  const originalSlides = Array.from(
    track.querySelectorAll(".welcome-product-slide")
  );

  if (!originalSlides.length) return;

  // Clear classes used by the previous fade slideshow.
  originalSlides.forEach((slide) => {
    slide.classList.remove("is-active", "is-hidden");
  });

  const slideDuration = 1200;
  const intervalTime = 3200;

  let currentIndex = 0;
  let isPlaying = true;
  let timer = null;
  let isAnimating = false;

  // Duplicate the slides at both ends for seamless looping.
  const before = document.createDocumentFragment();
  const after = document.createDocumentFragment();

  originalSlides.forEach((slide) => {
    const clone = slide.cloneNode(true);
    clone.dataset.carouselClone = "true";
    clone.setAttribute("aria-hidden", "true");
    before.appendChild(clone);
  });

  originalSlides.forEach((slide) => {
    const clone = slide.cloneNode(true);
    clone.dataset.carouselClone = "true";
    clone.setAttribute("aria-hidden", "true");
    after.appendChild(clone);
  });

  track.prepend(before);
  track.append(after);

  const allSlides = Array.from(
    track.querySelectorAll(".welcome-product-slide")
  );

  const originalCount = originalSlides.length;

  // Start at the real slides, between the two cloned sets.
  currentIndex = originalCount;

  function getStepWidth() {
    if (allSlides.length < 2) return 0;

    return (
      allSlides[1].getBoundingClientRect().left -
      allSlides[0].getBoundingClientRect().left
    );
  }

  function positionTrack(animate = true) {
    const step = getStepWidth();

    track.style.transition = animate
      ? `transform ${slideDuration}ms cubic-bezier(.25, .1, .25, 1)`
      : "none";

    track.style.transform =
      `translate3d(-${currentIndex * step}px, 0, 0)`;
  }

  function move(direction) {
    if (isAnimating) return;

    isAnimating = true;
    currentIndex += direction;
    positionTrack(true);
  }

  function next() {
    move(1);
  }

  function previous() {
    move(-1);
  }

  // When we reach a cloned section, silently reset
  // to its identical position in the original section.
  track.addEventListener("transitionend", (event) => {
    if (
      event.target !== track ||
      event.propertyName !== "transform"
    ) {
      return;
    }

    if (currentIndex >= originalCount * 2) {
      currentIndex -= originalCount;
      positionTrack(false);
    } else if (currentIndex < originalCount) {
      currentIndex += originalCount;
      positionTrack(false);
    }

    isAnimating = false;
  });

  function stopTimer() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  function startTimer() {
    stopTimer();

    if (!isPlaying || originalCount <= 1) return;

    timer = setInterval(next, intervalTime);
  }

  function updatePauseButton() {
    pauseButton.textContent = isPlaying ? "\u275A\u275A" : "\u25B6";

    pauseButton.setAttribute(
      "aria-label",
      isPlaying ? "Pause slideshow" : "Play slideshow"
    );
  }

  prevButton.addEventListener("click", () => {
    previous();
    startTimer();
  });

  nextButton.addEventListener("click", () => {
    next();
    startTimer();
  });

  pauseButton.addEventListener("click", () => {
    isPlaying = !isPlaying;

    updatePauseButton();

    if (isPlaying) {
      startTimer();
    } else {
      stopTimer();
    }
  });

  // Keep the carousel aligned when the browser resizes.
  window.addEventListener("resize", () => {
    positionTrack(false);
  });

  // Set the starting position without visible movement.
  positionTrack(false);
  updatePauseButton();
  startTimer();
});


/* =========================================
   KENZIEPRINTS — TRAVEL COMING SOON
   ========================================= */

document.addEventListener("DOMContentLoaded", () => {
  const travelLink = document.querySelector(".welcome-travel-link");
  const popup = document.getElementById("travel-coming-soon");
  const closeButton = document.querySelector(".welcome-coming-soon-close");

  if (!travelLink || !popup || !closeButton) return;

  let previousFocus = null;

  function openPopup(event) {
    event.preventDefault();

    previousFocus = document.activeElement;

    popup.hidden = false;
    popup.setAttribute("role", "dialog");
    popup.setAttribute("aria-modal", "true");
    popup.setAttribute("aria-label", "Travel Collection Coming Soon");

    closeButton.focus();
  }

  function closePopup() {
    popup.hidden = true;

    if (previousFocus) {
      previousFocus.focus();
    }
  }

  travelLink.addEventListener("click", openPopup);

  closeButton.addEventListener("click", closePopup);

  // Clicking the dark background closes the popup.
  popup.addEventListener("click", (event) => {
    if (event.target === popup) {
      closePopup();
    }
  });

  // Escape closes the popup.
  document.addEventListener("keydown", (event) => {
    if (popup.hidden) return;

    if (event.key === "Escape") {
      closePopup();
    }

    // Keep keyboard focus inside the popup.
    if (event.key === "Tab") {
      const focusable = Array.from(
        popup.querySelectorAll(
          'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => !element.disabled);

      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
});
