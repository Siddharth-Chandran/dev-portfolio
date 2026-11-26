/**
 * Interactive "Antigravity Model Usage" Sidecar Simulator
 * Pure client-side simulation mirroring the sidecar plugin's real-time behavior:
 * - 5s ETag short-circuit polling (304 -> 200 OK on stat/burst updates)
 * - Account model quota bars & live reset countdowns
 * - Session + subagent/swarm token aggregation
 * - Full / Minimal view mode toggle
 * - "Simulate Subagent Burst" action for interactive telemetry inspection
 */

function formatMinutes(totalMins) {
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
}

export function initSidecarSimulator() {
  const root = document.getElementById('sidecar-simulator');
  if (!root) return;

  const viewBtn = document.getElementById('sim-view-toggle');
  const burstBtn = document.getElementById('sim-burst-btn');
  const pollBadge = document.getElementById('sim-poll-badge');
  const burstBadge = document.getElementById('sim-burst-badge');

  const geminiPctEl = document.getElementById('sim-gemini-pct');
  const geminiBarEl = document.getElementById('sim-gemini-bar');
  const geminiProgressEl = document.getElementById('sim-gemini-progress');
  const geminiResetEl = document.getElementById('sim-gemini-reset');

  const claudePctEl = document.getElementById('sim-claude-pct');
  const claudeBarEl = document.getElementById('sim-claude-bar');
  const claudeProgressEl = document.getElementById('sim-claude-progress');
  const claudeResetEl = document.getElementById('sim-claude-reset');

  const totalTokensEl = document.getElementById('sim-total-tokens');
  const sessionTokensEl = document.getElementById('sim-session-tokens');
  const swarmTokensEl = document.getElementById('sim-swarm-tokens');
  const sessionBarEl = document.getElementById('sim-session-bar');
  const swarmBarEl = document.getElementById('sim-swarm-bar');

  const subagentListEl = document.getElementById('sim-subagents');
  const simLiveEl = document.getElementById('sim-live-status');

  const state = {
    view: 'full',
    burstCount: 0,
    geminiQuota: 82,
    claudeQuota: 46,
    geminiResetMins: 252, // 04h 12m
    claudeResetMins: 108, // 01h 48m
    sessionK: 104.6,
    swarmK: 43.6,
    pollTick: 5,
    lastStatus: '304',
    agents: [
      { name: 'research-survey', state: 'idle', tokensK: 18.4 },
      { name: 'shader-contour', state: 'active', tokensK: 16.2 },
      { name: 'verify-e2e', state: 'idle', tokensK: 9.0 },
    ],
  };

  let visible = false;
  let timerId = null;

  const render = () => {
    root.setAttribute('data-sim-view', state.view);
    root.setAttribute('data-burst-count', String(state.burstCount));

    if (viewBtn) {
      const isMinimal = state.view === 'minimal';
      viewBtn.setAttribute('aria-pressed', String(isMinimal));
      const labelEl = viewBtn.querySelector('.sim-view-label');
      if (labelEl) {
        labelEl.textContent = isMinimal ? 'Minimal' : 'Full';
      }
    }

    if (pollBadge) {
      pollBadge.textContent =
        state.lastStatus === '200'
          ? `POLL ${state.pollTick}s · ETag 200`
          : `POLL ${state.pollTick}s · ETag 304`;
      pollBadge.setAttribute('data-http-status', state.lastStatus);
    }

    if (burstBadge) {
      burstBadge.textContent =
        state.burstCount === 0
          ? '3 subagents synced'
          : `Burst #${state.burstCount} · ${state.agents.length} subagents`;
    }

    if (geminiPctEl) geminiPctEl.textContent = `${state.geminiQuota}%`;
    if (geminiBarEl) geminiBarEl.style.width = `${state.geminiQuota}%`;
    if (geminiProgressEl) {
      geminiProgressEl.setAttribute('aria-valuenow', String(state.geminiQuota));
    }
    if (geminiResetEl) {
      geminiResetEl.textContent = `RESET ${formatMinutes(state.geminiResetMins)}`;
    }

    if (claudePctEl) claudePctEl.textContent = `${state.claudeQuota}%`;
    if (claudeBarEl) claudeBarEl.style.width = `${state.claudeQuota}%`;
    if (claudeProgressEl) {
      claudeProgressEl.setAttribute('aria-valuenow', String(state.claudeQuota));
    }
    if (claudeResetEl) {
      claudeResetEl.textContent = `RESET ${formatMinutes(state.claudeResetMins)}`;
    }

    const totalK = state.sessionK + state.swarmK;
    if (totalTokensEl) totalTokensEl.textContent = `${totalK.toFixed(1)}K`;
    if (sessionTokensEl) sessionTokensEl.textContent = `${state.sessionK.toFixed(1)}K`;
    if (swarmTokensEl) swarmTokensEl.textContent = `${state.swarmK.toFixed(1)}K`;

    // Scale stacked bars proportionally against a dynamic ceiling (at least 250K)
    const ceiling = Math.max(240, Math.ceil((totalK + 30) / 60) * 60);
    const sessionPct = Math.min(100, (state.sessionK / ceiling) * 100);
    const swarmPct = Math.min(100 - sessionPct, (state.swarmK / ceiling) * 100);
    if (sessionBarEl) sessionBarEl.style.width = `${sessionPct.toFixed(1)}%`;
    if (swarmBarEl) swarmBarEl.style.width = `${swarmPct.toFixed(1)}%`;

    if (subagentListEl) {
      const items = subagentListEl.querySelectorAll('.sim-agent-row');
      state.agents.forEach((agent, idx) => {
        const row = items[idx];
        if (!row) return;
        const nameEl = row.querySelector('.sim-agent-name');
        const stateEl = row.querySelector('.sim-agent-state');
        const tokEl = row.querySelector('.sim-agent-tokens');
        if (nameEl) nameEl.textContent = agent.name;
        if (stateEl) {
          stateEl.textContent = agent.state;
          stateEl.setAttribute('data-agent-state', agent.state);
        }
        if (tokEl) tokEl.textContent = `${agent.tokensK.toFixed(1)}K`;
      });
    }
  };

  viewBtn?.addEventListener('click', () => {
    state.view = state.view === 'full' ? 'minimal' : 'full';
    render();
    if (simLiveEl) {
      simLiveEl.textContent = `Sidecar simulator switched to ${state.view} view.`;
    }
  });

  burstBtn?.addEventListener('click', () => {
    state.burstCount += 1;
    state.lastStatus = '200';
    state.pollTick = 5;

    // Cycle quotas realistically so repeated clicks stay informative and non-zero
    state.geminiQuota = state.geminiQuota <= 24 ? 86 : state.geminiQuota - 4;
    state.claudeQuota = state.claudeQuota <= 16 ? 78 : state.claudeQuota - 6;

    const deltaSession = 5.4 + ((state.burstCount * 1.7) % 4.2);
    const deltaSwarm = 18.6 + ((state.burstCount * 6.3) % 14.5);
    state.sessionK = Number((state.sessionK + deltaSession).toFixed(1));
    state.swarmK = Number((state.swarmK + deltaSwarm).toFixed(1));

    state.agents[0].tokensK = Number((state.agents[0].tokensK + deltaSwarm * 0.36).toFixed(1));
    state.agents[1].tokensK = Number((state.agents[1].tokensK + deltaSwarm * 0.42).toFixed(1));
    state.agents[2].tokensK = Number((state.agents[2].tokensK + deltaSwarm * 0.22).toFixed(1));

    state.agents.forEach((agent, idx) => {
      agent.state = idx === state.burstCount % state.agents.length || idx === 1 ? 'active' : 'synced';
    });

    render();
    if (simLiveEl) {
      const total = (state.sessionK + state.swarmK).toFixed(1);
      simLiveEl.textContent = `Subagent burst ${state.burstCount} simulated: ${total}K tokens synced.`;
    }
  });

  const tickPoll = () => {
    if (!visible || document.hidden) return;
    state.pollTick -= 1;
    if (state.pollTick <= 0) {
      state.pollTick = 5;
      // Short-circuit back to 304 when idle between bursts
      state.lastStatus = '304';
      if (state.geminiResetMins > 1) state.geminiResetMins -= 1;
      if (state.claudeResetMins > 1) state.claudeResetMins -= 1;
    }
    render();
  };

  const syncTimer = () => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (visible && !document.hidden && !reduced) {
      if (!timerId) {
        timerId = window.setInterval(tickPoll, 1000);
      }
    } else if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  };

  const io = new IntersectionObserver(
    (entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      syncTimer();
    },
    { threshold: 0.1 }
  );
  io.observe(root);

  document.addEventListener('visibilitychange', syncPlaybackSafe);
  function syncPlaybackSafe() {
    syncTimer();
  }

  render();
}
