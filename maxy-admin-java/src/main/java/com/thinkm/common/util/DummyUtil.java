package com.thinkm.common.util;

import com.google.gson.reflect.TypeToken;
import lombok.extern.slf4j.Slf4j;

import java.lang.reflect.Type;
import java.util.*;

@SuppressWarnings("unchecked")
@Slf4j
public class DummyUtil {
    private static final Type typeToken = new TypeToken<HashMap<String, Object>>() {
    }.getType();

    public static String makeErrorStackDummy() {
        if (new Random().nextInt(0, 10) % 2 == 0) {
            return """
                    page-b0aedb59bf76801a.js:1 Uncaught (in promise) Error: Intentional login click error
                    at B (page-b0aedb59bf76801a.js:1:8190)
                    at sY (4bd1b696-053d5bec6121fa8c.js:1:151226)
                    at 4bd1b696-053d5bec6121fa8c.js:1:157114
                    at nU (4bd1b696-053d5bec6121fa8c.js:1:20179)
                    at s1 (4bd1b696-053d5bec6121fa8c.js:1:152459)
                    at fC (4bd1b696-053d5bec6121fa8c.js:1:188384)
                    at fx (4bd1b696-053d5bec6121fa8c.js:1:188206)
                    """;
        } else {
            return """
                    Uncaught TypeError: Cannot read properties of undefined (reading 'callbackid") Cannot read properties undefined (reading 'callbackid') TypeError: Cannot read properties of undefined (reading 'callbackid")
                    Object.callBackResult (https://corp.co.kr:8080/spa/top-dir/dir2/page-b0aedb59bf76801a.js:1:8190)
                    at <anonymous>:1:16
                    """;
        }
    }

    public static Map<String, Object> makeJenniferDummy() {
        log.debug("ResponseTime popup -> JenniferDummy");

        String dummy = """
                {
                    "domainId": 1000,
                    "domainName": "maxy",
                    "instanceId": 75536,
                    "instanceOid": 0,
                    "instanceName": "10000",
                    "business": [],
                    "businessId": [],
                    "businessName": [],
                    "txid": "71427699633469604",
                    "guid": "",
                    "clientIp": "192.168.100.6",
                    "clientId": "7703606793973122337",
                    "userId": "",
                    "networkTime": 0,
                    "frontendTime": 0,
                    "startTime": "1720512925926",
                    "endTime": "1720512925999",
                    "responseTime": 73,
                    "cpuTime": 18,
                    "sqlTime": 25,
                    "fetchTime": 0,
                    "externalcallTime": 0,
                    "errorType": "",
                    "applicationName": "/pa/0000/getLoadingDetail.maxy"
                }
                """;

        return JsonUtil.fromJson(dummy, Map.class);
    }

    public static Map<String, Object> makeStackTraceDummy() {
        log.debug("로그분석 -> Crash -> 첫 번째 데이터");
        String dummyStr = """
                {
                  "comType": "9",
                  "cpuUsage": 100,
                  "webviewVer": "118.0.5993.112",
                  "timezone": "America/Los_Angeles",
                  "packageNm": "maxy",
                  "deviceId": "c8b18d12-3079-3644-a28b-1ea585d313a2",
                  "osVer": "13",
                  "memUsage": 17345,
                  "storageUsage": 44847,
                  "simOperatorNm": "",
                  "osType": "Android",
                  "comSensitivity": "",
                  "appVer": "1.6.5",
                  "ip": "104.172.228.37",
                  "storageTotal": 230833,
                  "batteryLvl": "100",
                  "intervaltime": 0,
                  "regDt": null,
                  "logName": "class java.lang.NullPointerException: Attempt to invoke virtual method 'android.net.Uri android.content.Intent.getData()' on a null object reference",
                  "appBuildNum": "165",
                  "contents": {
                    "prime": "class java.lang.NullPointerException: Attempt to invoke virtual method 'android.net.Uri android.content.Intent.getData()' on a null object reference\\nat i7.d.x(Unknown Source:38)\\nat i7.d.t(Unknown Source:8)\\nat i7.d.onCreateView(Unknown Source:10)\\nat androidx.fragment.app.Fragment.performCreateView(Unknown Source:19)\\nat androidx.fragment.app.FragmentStateManager.createView(Unknown Source:188)\\nat androidx.fragment.app.FragmentStateManager.moveToExpectedState(Unknown Source:116)\\nat androidx.fragment.app.FragmentStore.moveToExpectedState(Unknown Source:30)\\nat androidx.fragment.app.FragmentManager.moveToState(Unknown Source:32)\\nat androidx.fragment.app.FragmentManager.dispatchStateChange(Unknown Source:9)\\nat androidx.fragment.app.FragmentManager.dispatchActivityCreated(Unknown Source:11)\\nat androidx.fragment.app.FragmentController.dispatchActivityCreated(Unknown Source:4)\\nat androidx.fragment.app.FragmentActivity.onStart(Unknown Source:20)\\nat androidx.appcompat.app.AppCompatActivity.onStart(Unknown Source:0)\\nat android.app.Instrumentation.callActivityOnStart(Instrumentation.java:1543)\\nat android.app.Activity.performStart(Activity.java:8682)\\nat android.app.ActivityThread.handleStartActivity(ActivityThread.java:4219)\\nat android.app.servertransaction.TransactionExecutor.performLifecycleSequence(TransactionExecutor.java:221)\\nat android.app.servertransaction.TransactionExecutor.cycleToPath(TransactionExecutor.java:201)\\nat android.app.servertransaction.TransactionExecutor.executeLifecycleState(TransactionExecutor.java:173)\\nat android.app.servertransaction.TransactionExecutor.execute(TransactionExecutor.java:97)\\nat android.app.ActivityThread$H.handleMessage(ActivityThread.java:2584)\\nat android.os.Handler.dispatchMessage(Handler.java:106)\\nat android.os.Looper.loopOnce(Looper.java:226)\\nat android.os.Looper.loop(Looper.java:313)\\nat android.app.ActivityThread.main(ActivityThread.java:8810)\\nat java.lang.reflect.Method.invoke(Native Method)\\nat com.android.internal.os.RuntimeInit$MethodAndArgsCaller.run(RuntimeInit.java:604)\\nat com.android.internal.os.ZygoteInit.main(ZygoteInit.java:1067)",
                    "trace": [
                      {
                        "subLine": [
                          {
                            "text": "android.os.BinderProxy.transactNative(Native Method)"
                          }
                        ],
                        "threadName": "pool-5-thread-1",
                        "child": [
                          {
                            "text": "android.os.BinderProxy.transact(BinderProxy.java:662)"
                          },
                          {
                            "text": "android.content.ContentProviderProxy.query(ContentProviderNative.java:479)"
                          },
                          {
                            "text": "android.content.ContentResolver.query(ContentResolver.java:1226)"
                          },
                          {
                            "text": "android.content.ContentResolver.query(ContentResolver.java:1158)"
                          },
                          {
                            "text": "android.content.ContentResolver.query(ContentResolver.java:1114)"
                          },
                          {
                            "text": "com.facebook.internal.a.h(Unknown Source:121)"
                          },
                          {
                            "text": "m0.d.e(Unknown Source:17)"
                          },
                          {
                            "text": "m0.d.b(Unknown Source:25)"
                          },
                          {
                            "text": "m0.e.k(Unknown Source:6)"
                          },
                          {
                            "text": "m0.e$c.run(Unknown Source:2)"
                          },
                          {
                            "text": "java.util.concurrent.Executors$RunnableAdapter.call(Executors.java:463)"
                          },
                          {
                            "text": "java.util.concurrent.FutureTask.run(FutureTask.java:264)"
                          },
                          {
                            "text": "java.util.concurrent.ScheduledThreadPoolExecutor$ScheduledFutureTask.run(ScheduledThreadPoolExecutor.java:307)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1137)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:637)"
                          },
                          {
                            "text": "java.lang.Thread.run(Thread.java:1012)"
                          }
                        ]
                      },
                      {
                        "subLine": [
                          {
                            "text": "java.lang.Object.wait(Native Method)"
                          }
                        ],
                        "threadName": "Timer-2",
                        "child": [
                          {
                            "text": "java.lang.Object.wait(Object.java:442)"
                          },
                          {
                            "text": "java.lang.Object.wait(Object.java:568)"
                          },
                          {
                            "text": "java.util.TimerThread.mainLoop(Timer.java:534)"
                          },
                          {
                            "text": "java.util.TimerThread.run(Timer.java:513)"
                          }
                        ]
                      },
                      {
                        "threadName": "binder:15699_4"
                      },
                      {
                        "subLine": [
                          {
                            "text": "android.os.MessageQueue.nativePollOnce(Native Method)"
                          }
                        ],
                        "threadName": "MAXY_Service",
                        "child": [
                          {
                            "text": "android.os.MessageQueue.next(MessageQueue.java:335)"
                          },
                          {
                            "text": "android.os.Looper.loopOnce(Looper.java:186)"
                          },
                          {
                            "text": "android.os.Looper.loop(Looper.java:313)"
                          },
                          {
                            "text": "android.os.HandlerThread.run(HandlerThread.java:67)"
                          }
                        ]
                      },
                      {
                        "subLine": [
                          {
                            "text": "jdk.internal.misc.Unsafe.park(Native Method)"
                          }
                        ],
                        "threadName": "PlatformServiceBridgeHandlerThread",
                        "child": [
                          {
                            "text": "java.util.concurrent.locks.LockSupport.parkNanos(LockSupport.java:234)"
                          },
                          {
                            "text": "java.util.concurrent.locks.AbstractQueuedSynchronizer.doAcquireSharedNanos(AbstractQueuedSynchronizer.java:1079)"
                          },
                          {
                            "text": "java.util.concurrent.locks.AbstractQueuedSynchronizer.tryAcquireSharedNanos(AbstractQueuedSynchronizer.java:1369)"
                          },
                          {
                            "text": "java.util.concurrent.CountDownLatch.await(CountDownLatch.java:278)"
                          },
                          {
                            "text": "WV.ES.a(chromium-TrichromeWebViewGoogle6432.aab-stable-599311233:44)"
                          },
                          {
                            "text": "WV.kH.run(chromium-TrichromeWebViewGoogle6432.aab-stable-599311233:50)"
                          },
                          {
                            "text": "android.os.Handler.handleCallback(Handler.java:942)"
                          },
                          {
                            "text": "android.os.Handler.dispatchMessage(Handler.java:99)"
                          },
                          {
                            "text": "android.os.Looper.loopOnce(Looper.java:226)"
                          },
                          {
                            "text": "android.os.Looper.loop(Looper.java:313)"
                          },
                          {
                            "text": "android.os.HandlerThread.run(HandlerThread.java:67)"
                          }
                        ]
                      },
                      {
                        "subLine": [
                          {
                            "text": "java.lang.Object.wait(Native Method)"
                          }
                        ],
                        "threadName": "FinalizerDaemon",
                        "child": [
                          {
                            "text": "java.lang.Object.wait(Object.java:442)"
                          },
                          {
                            "text": "java.lang.ref.ReferenceQueue.remove(ReferenceQueue.java:203)"
                          },
                          {
                            "text": "java.lang.ref.ReferenceQueue.remove(ReferenceQueue.java:224)"
                          },
                          {
                            "text": "java.lang.Daemons$FinalizerDaemon.runInternal(Daemons.java:300)"
                          },
                          {
                            "text": "java.lang.Daemons$Daemon.run(Daemons.java:140)"
                          },
                          {
                            "text": "java.lang.Thread.run(Thread.java:1012)"
                          }
                        ]
                      },
                      {
                        "threadName": "Chrome_InProcGpuThread"
                      },
                      {
                        "subLine": [
                          {
                            "text": "jdk.internal.misc.Unsafe.park(Native Method)"
                          }
                        ],
                        "threadName": "queued-work-looper-data",
                        "child": [
                          {
                            "text": "java.util.concurrent.locks.LockSupport.park(LockSupport.java:194)"
                          },
                          {
                            "text": "java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.await(AbstractQueuedSynchronizer.java:2081)"
                          },
                          {
                            "text": "java.util.concurrent.LinkedBlockingQueue.take(LinkedBlockingQueue.java:433)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1063)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1123)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:637)"
                          },
                          {
                            "text": "java.lang.Thread.run(Thread.java:1012)"
                          }
                        ]
                      },
                      {
                        "subLine": [
                          {
                            "text": "java.lang.Thread.sleep(Native Method)"
                          }
                        ],
                        "threadName": "FinalizerWatchdogDaemon",
                        "child": [
                          {
                            "text": "java.lang.Thread.sleep(Thread.java:450)"
                          },
                          {
                            "text": "java.lang.Thread.sleep(Thread.java:355)"
                          },
                          {
                            "text": "java.lang.Daemons$FinalizerWatchdogDaemon.sleepForNanos(Daemons.java:438)"
                          },
                          {
                            "text": "java.lang.Daemons$FinalizerWatchdogDaemon.waitForProgress(Daemons.java:480)"
                          },
                          {
                            "text": "java.lang.Daemons$FinalizerWatchdogDaemon.runInternal(Daemons.java:369)"
                          },
                          {
                            "text": "java.lang.Daemons$Daemon.run(Daemons.java:140)"
                          },
                          {
                            "text": "java.lang.Thread.run(Thread.java:1012)"
                          }
                        ]
                      },
                      {
                        "threadName": "HeapTaskDaemon"
                      },
                      {
                        "threadName": "Chrome_IOThread"
                      },
                      {
                        "threadName": "binder:15699_3"
                      },
                      {
                        "subLine": [
                          {
                            "text": "java.lang.Object.wait(Native Method)"
                          }
                        ],
                        "threadName": "Timer-1",
                        "child": [
                          {
                            "text": "java.lang.Object.wait(Object.java:442)"
                          },
                          {
                            "text": "java.lang.Object.wait(Object.java:568)"
                          },
                          {
                            "text": "java.util.TimerThread.mainLoop(Timer.java:534)"
                          },
                          {
                            "text": "java.util.TimerThread.run(Timer.java:513)"
                          }
                        ]
                      },
                      {
                        "subLine": [
                          {
                            "text": "dalvik.system.VMStack.getThreadStackTrace(Native Method)"
                          }
                        ],
                        "threadName": "main",
                        "child": [
                          {
                            "text": "java.lang.Thread.getStackTrace(Thread.java:1841)"
                          },
                          {
                            "text": "java.lang.Thread.getAllStackTraces(Thread.java:1909)"
                          },
                          {
                            "text": "kr.co.miaps.mpas.MAXY.h(Unknown Source:5)"
                          },
                          {
                            "text": "kr.co.miaps.mpas.MAXY.G(Unknown Source:0)"
                          },
                          {
                            "text": "kr.co.miaps.mpas.MAXY$f.uncaughtException(Unknown Source:192)"
                          },
                          {
                            "text": "z0.a.uncaughtException(Unknown Source:20)"
                          },
                          {
                            "text": "org.chromium.base.JavaExceptionReporter.uncaughtException(chromium-TrichromeWebViewGoogle6432.aab-stable-599311233:17)"
                          },
                          {
                            "text": "java.lang.ThreadGroup.uncaughtException(ThreadGroup.java:1073)"
                          },
                          {
                            "text": "java.lang.ThreadGroup.uncaughtException(ThreadGroup.java:1068)"
                          },
                          {
                            "text": "java.lang.Thread.dispatchUncaughtException(Thread.java:2306)"
                          }
                        ]
                      },
                      {
                        "threadName": "hwuiTask0"
                      },
                      {
                        "subLine": [
                          {
                            "text": "jdk.internal.misc.Unsafe.park(Native Method)"
                          }
                        ],
                        "threadName": "CrAsyncTask #2",
                        "child": [
                          {
                            "text": "java.util.concurrent.locks.LockSupport.parkNanos(LockSupport.java:234)"
                          },
                          {
                            "text": "java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.awaitNanos(AbstractQueuedSynchronizer.java:2123)"
                          },
                          {
                            "text": "java.util.concurrent.ArrayBlockingQueue.poll(ArrayBlockingQueue.java:432)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1062)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1123)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:637)"
                          },
                          {
                            "text": "java.lang.Thread.run(Thread.java:1012)"
                          }
                        ]
                      },
                      {
                        "subLine": [
                          {
                            "text": "android.os.BinderProxy.transactNative(Native Method)"
                          }
                        ],
                        "threadName": "AsyncTask #1",
                        "child": [
                          {
                            "text": "android.os.BinderProxy.transact(BinderProxy.java:662)"
                          },
                          {
                            "text": "android.content.ContentProviderProxy.query(ContentProviderNative.java:479)"
                          },
                          {
                            "text": "android.content.ContentResolver.query(ContentResolver.java:1226)"
                          },
                          {
                            "text": "android.content.ContentResolver.query(ContentResolver.java:1158)"
                          },
                          {
                            "text": "android.content.ContentResolver.query(ContentResolver.java:1114)"
                          },
                          {
                            "text": "com.facebook.internal.a.h(Unknown Source:121)"
                          },
                          {
                            "text": "com.facebook.internal.a.l(Unknown Source:0)"
                          },
                          {
                            "text": "n0.a$a.run(Unknown Source:4)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1137)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:637)"
                          },
                          {
                            "text": "java.lang.Thread.run(Thread.java:1012)"
                          }
                        ]
                      },
                      {
                        "subLine": [
                          {
                            "text": "jdk.internal.misc.Unsafe.park(Native Method)"
                          }
                        ],
                        "threadName": "AsyncTask #5",
                        "child": [
                          {
                            "text": "java.util.concurrent.locks.LockSupport.parkNanos(LockSupport.java:234)"
                          },
                          {
                            "text": "java.util.concurrent.SynchronousQueue$TransferStack.awaitFulfill(SynchronousQueue.java:463)"
                          },
                          {
                            "text": "java.util.concurrent.SynchronousQueue$TransferStack.transfer(SynchronousQueue.java:361)"
                          },
                          {
                            "text": "java.util.concurrent.SynchronousQueue.poll(SynchronousQueue.java:939)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1062)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1123)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:637)"
                          },
                          {
                            "text": "java.lang.Thread.run(Thread.java:1012)"
                          }
                        ]
                      },
                      {
                        "subLine": [
                          {
                            "text": "android.os.MessageQueue.nativePollOnce(Native Method)"
                          }
                        ],
                        "threadName": "InsetsAnimations",
                        "child": [
                          {
                            "text": "android.os.MessageQueue.next(MessageQueue.java:335)"
                          },
                          {
                            "text": "android.os.Looper.loopOnce(Looper.java:186)"
                          },
                          {
                            "text": "android.os.Looper.loop(Looper.java:313)"
                          },
                          {
                            "text": "android.os.HandlerThread.run(HandlerThread.java:67)"
                          }
                        ]
                      },
                      {
                        "subLine": [
                          {
                            "text": "java.lang.Object.wait(Native Method)"
                          }
                        ],
                        "threadName": "glide-active-resources",
                        "child": [
                          {
                            "text": "java.lang.Object.wait(Object.java:442)"
                          },
                          {
                            "text": "java.lang.ref.ReferenceQueue.remove(ReferenceQueue.java:203)"
                          },
                          {
                            "text": "java.lang.ref.ReferenceQueue.remove(ReferenceQueue.java:224)"
                          },
                          {
                            "text": "m.a.b(Unknown Source:6)"
                          },
                          {
                            "text": "m.a$b.run(Unknown Source:2)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1137)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:637)"
                          },
                          {
                            "text": "m.a$a$a.run(Unknown Source:7)"
                          },
                          {
                            "text": "java.lang.Thread.run(Thread.java:1012)"
                          }
                        ]
                      },
                      {
                        "subLine": [
                          {
                            "text": "jdk.internal.misc.Unsafe.park(Native Method)"
                          }
                        ],
                        "threadName": "queued-work-looper-data",
                        "child": [
                          {
                            "text": "java.util.concurrent.locks.LockSupport.park(LockSupport.java:194)"
                          },
                          {
                            "text": "java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.await(AbstractQueuedSynchronizer.java:2081)"
                          },
                          {
                            "text": "java.util.concurrent.LinkedBlockingQueue.take(LinkedBlockingQueue.java:433)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1063)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1123)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:637)"
                          },
                          {
                            "text": "java.lang.Thread.run(Thread.java:1012)"
                          }
                        ]
                      },
                      {
                        "threadName": "hwuiTask1"
                      },
                      {
                        "subLine": [
                          {
                            "text": "e.a$c.run(Unknown Source:2)"
                          }
                        ],
                        "threadName": "MAXY_F_Worker"
                      },
                      {
                        "threadName": "AudioThread"
                      },
                      {
                        "subLine": [
                          {
                            "text": "jdk.internal.misc.Unsafe.park(Native Method)"
                          }
                        ],
                        "threadName": "pool-4-thread-1",
                        "child": [
                          {
                            "text": "java.util.concurrent.locks.LockSupport.parkNanos(LockSupport.java:234)"
                          },
                          {
                            "text": "java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.awaitNanos(AbstractQueuedSynchronizer.java:2123)"
                          },
                          {
                            "text": "java.util.concurrent.ScheduledThreadPoolExecutor$DelayedWorkQueue.take(ScheduledThreadPoolExecutor.java:1188)"
                          },
                          {
                            "text": "java.util.concurrent.ScheduledThreadPoolExecutor$DelayedWorkQueue.take(ScheduledThreadPoolExecutor.java:905)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1063)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1123)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:637)"
                          },
                          {
                            "text": "java.lang.Thread.run(Thread.java:1012)"
                          }
                        ]
                      },
                      {
                        "threadName": "ThreadPoolForeg"
                      },
                      {
                        "subLine": [
                          {
                            "text": "java.lang.Object.wait(Native Method)"
                          }
                        ],
                        "threadName": "CleanupReference",
                        "child": [
                          {
                            "text": "java.lang.Object.wait(Object.java:442)"
                          },
                          {
                            "text": "java.lang.ref.ReferenceQueue.remove(ReferenceQueue.java:203)"
                          },
                          {
                            "text": "java.lang.ref.ReferenceQueue.remove(ReferenceQueue.java:224)"
                          },
                          {
                            "text": "WV.md.run(chromium-TrichromeWebViewGoogle6432.aab-stable-599311233:3)"
                          }
                        ]
                      },
                      {
                        "subLine": [
                          {
                            "text": "jdk.internal.misc.Unsafe.park(Native Method)"
                          }
                        ],
                        "threadName": "OkHttp Dispatcher",
                        "child": [
                          {
                            "text": "java.util.concurrent.locks.LockSupport.parkNanos(LockSupport.java:234)"
                          },
                          {
                            "text": "java.util.concurrent.SynchronousQueue$TransferStack.awaitFulfill(SynchronousQueue.java:463)"
                          },
                          {
                            "text": "java.util.concurrent.SynchronousQueue$TransferStack.transfer(SynchronousQueue.java:361)"
                          },
                          {
                            "text": "java.util.concurrent.SynchronousQueue.poll(SynchronousQueue.java:939)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1062)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1123)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:637)"
                          },
                          {
                            "text": "java.lang.Thread.run(Thread.java:1012)"
                          }
                        ]
                      },
                      {
                        "subLine": [
                          {
                            "text": "jdk.internal.misc.Unsafe.park(Native Method)"
                          }
                        ],
                        "threadName": "queued-work-looper-data",
                        "child": [
                          {
                            "text": "java.util.concurrent.locks.LockSupport.park(LockSupport.java:194)"
                          },
                          {
                            "text": "java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.await(AbstractQueuedSynchronizer.java:2081)"
                          },
                          {
                            "text": "java.util.concurrent.LinkedBlockingQueue.take(LinkedBlockingQueue.java:433)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1063)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1123)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:637)"
                          },
                          {
                            "text": "java.lang.Thread.run(Thread.java:1012)"
                          }
                        ]
                      },
                      {
                        "subLine": [
                          {
                            "text": "jdk.internal.misc.Unsafe.park(Native Method)"
                          }
                        ],
                        "threadName": "pool-3-thread-1",
                        "child": [
                          {
                            "text": "java.util.concurrent.locks.LockSupport.parkNanos(LockSupport.java:234)"
                          },
                          {
                            "text": "java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.awaitNanos(AbstractQueuedSynchronizer.java:2123)"
                          },
                          {
                            "text": "java.util.concurrent.ScheduledThreadPoolExecutor$DelayedWorkQueue.take(ScheduledThreadPoolExecutor.java:1188)"
                          },
                          {
                            "text": "java.util.concurrent.ScheduledThreadPoolExecutor$DelayedWorkQueue.take(ScheduledThreadPoolExecutor.java:905)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1063)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1123)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:637)"
                          },
                          {
                            "text": "java.lang.Thread.run(Thread.java:1012)"
                          }
                        ]
                      },
                      {
                        "subLine": [
                          {
                            "text": "android.os.BinderProxy.transactNative(Native Method)"
                          }
                        ],
                        "threadName": "Measurement Worker",
                        "child": [
                          {
                            "text": "android.os.BinderProxy.transact(BinderProxy.java:662)"
                          },
                          {
                            "text": "com.google.android.gms.internal.measurement.zza.zza(Unknown Source:7)"
                          },
                          {
                            "text": "com.google.android.gms.measurement.internal.zzen.zzc(Unknown Source:9)"
                          },
                          {
                            "text": "com.google.android.gms.measurement.internal.zzin.run(Unknown Source:37)"
                          },
                          {
                            "text": "com.google.android.gms.measurement.internal.zzik.zzal(Unknown Source:44)"
                          },
                          {
                            "text": "com.google.android.gms.measurement.internal.zzik.zza(Unknown Source:11)"
                          },
                          {
                            "text": "com.google.android.gms.measurement.internal.zzjd.run(Unknown Source:42)"
                          },
                          {
                            "text": "java.util.concurrent.Executors$RunnableAdapter.call(Executors.java:463)"
                          },
                          {
                            "text": "java.util.concurrent.FutureTask.run(FutureTask.java:264)"
                          },
                          {
                            "text": "com.google.android.gms.measurement.internal.zzfy.run(Unknown Source:49)"
                          }
                        ]
                      },
                      {
                        "subLine": [
                          {
                            "text": "java.lang.Object.wait(Native Method)"
                          }
                        ],
                        "threadName": "ReferenceQueueDaemon",
                        "child": [
                          {
                            "text": "java.lang.Object.wait(Object.java:442)"
                          },
                          {
                            "text": "java.lang.Object.wait(Object.java:568)"
                          },
                          {
                            "text": "java.lang.Daemons$ReferenceQueueDaemon.runInternal(Daemons.java:232)"
                          },
                          {
                            "text": "java.lang.Daemons$Daemon.run(Daemons.java:140)"
                          },
                          {
                            "text": "java.lang.Thread.run(Thread.java:1012)"
                          }
                        ]
                      },
                      {
                        "subLine": [
                          {
                            "text": "java.lang.Object.wait(Native Method)"
                          }
                        ],
                        "threadName": "logGather Timer",
                        "child": [
                          {
                            "text": "java.lang.Object.wait(Object.java:442)"
                          },
                          {
                            "text": "java.util.TimerThread.mainLoop(Timer.java:560)"
                          },
                          {
                            "text": "java.util.TimerThread.run(Timer.java:513)"
                          }
                        ]
                      },
                      {
                        "subLine": [
                          {
                            "text": "java.lang.Thread.sleep(Native Method)"
                          }
                        ],
                        "threadName": "[MAXY-ANR-ERROR]",
                        "child": [
                          {
                            "text": "java.lang.Thread.sleep(Thread.java:450)"
                          },
                          {
                            "text": "java.lang.Thread.sleep(Thread.java:355)"
                          },
                          {
                            "text": "a3.b.run(Unknown Source:40)"
                          }
                        ]
                      },
                      {
                        "threadName": "binder:15699_2"
                      },
                      {
                        "threadName": "ThreadPoolForeg"
                      },
                      {
                        "threadName": "Signal Catcher"
                      },
                      {
                        "subLine": [
                          {
                            "text": "jdk.internal.misc.Unsafe.park(Native Method)"
                          }
                        ],
                        "threadName": "AsyncTask #6",
                        "child": [
                          {
                            "text": "java.util.concurrent.locks.LockSupport.parkNanos(LockSupport.java:234)"
                          },
                          {
                            "text": "java.util.concurrent.SynchronousQueue$TransferStack.awaitFulfill(SynchronousQueue.java:463)"
                          },
                          {
                            "text": "java.util.concurrent.SynchronousQueue$TransferStack.transfer(SynchronousQueue.java:361)"
                          },
                          {
                            "text": "java.util.concurrent.SynchronousQueue.poll(SynchronousQueue.java:939)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1062)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1123)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:637)"
                          },
                          {
                            "text": "java.lang.Thread.run(Thread.java:1012)"
                          }
                        ]
                      },
                      {
                        "subLine": [
                          {
                            "text": "jdk.internal.misc.Unsafe.park(Native Method)"
                          }
                        ],
                        "threadName": "queued-work-looper-data",
                        "child": [
                          {
                            "text": "java.util.concurrent.locks.LockSupport.park(LockSupport.java:194)"
                          },
                          {
                            "text": "java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.await(AbstractQueuedSynchronizer.java:2081)"
                          },
                          {
                            "text": "java.util.concurrent.LinkedBlockingQueue.take(LinkedBlockingQueue.java:433)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1063)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1123)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:637)"
                          },
                          {
                            "text": "java.lang.Thread.run(Thread.java:1012)"
                          }
                        ]
                      },
                      {
                        "subLine": [
                          {
                            "text": "jdk.internal.misc.Unsafe.park(Native Method)"
                          }
                        ],
                        "threadName": "firebase-iid-executor",
                        "child": [
                          {
                            "text": "java.util.concurrent.locks.LockSupport.parkNanos(LockSupport.java:234)"
                          },
                          {
                            "text": "java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.awaitNanos(AbstractQueuedSynchronizer.java:2123)"
                          },
                          {
                            "text": "java.util.concurrent.LinkedBlockingQueue.poll(LinkedBlockingQueue.java:458)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1062)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1123)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:637)"
                          },
                          {
                            "text": "java.lang.Thread.run(Thread.java:1012)"
                          }
                        ]
                      },
                      {
                        "subLine": [
                          {
                            "text": "java.lang.Object.wait(Native Method)"
                          }
                        ],
                        "threadName": "Timer-3",
                        "child": [
                          {
                            "text": "java.lang.Object.wait(Object.java:442)"
                          },
                          {
                            "text": "java.lang.Object.wait(Object.java:568)"
                          },
                          {
                            "text": "java.util.TimerThread.mainLoop(Timer.java:534)"
                          },
                          {
                            "text": "java.util.TimerThread.run(Timer.java:513)"
                          }
                        ]
                      },
                      {
                        "subLine": [
                          {
                            "text": "android.os.BinderProxy.transactNative(Native Method)"
                          }
                        ],
                        "threadName": "AsyncTask #2",
                        "child": [
                          {
                            "text": "android.os.BinderProxy.transact(BinderProxy.java:662)"
                          },
                          {
                            "text": "android.content.ContentProviderProxy.query(ContentProviderNative.java:479)"
                          },
                          {
                            "text": "android.content.ContentResolver.query(ContentResolver.java:1226)"
                          },
                          {
                            "text": "android.content.ContentResolver.query(ContentResolver.java:1158)"
                          },
                          {
                            "text": "android.content.ContentResolver.query(ContentResolver.java:1114)"
                          },
                          {
                            "text": "com.facebook.internal.a.h(Unknown Source:121)"
                          },
                          {
                            "text": "com.facebook.o.y(Unknown Source:4)"
                          },
                          {
                            "text": "com.facebook.o$e.run(Unknown Source:4)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1137)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:637)"
                          },
                          {
                            "text": "java.lang.Thread.run(Thread.java:1012)"
                          }
                        ]
                      },
                      {
                        "threadName": "binder:15699_1"
                      },
                      {
                        "subLine": [
                          {
                            "text": "java.lang.Thread.sleep(Native Method)"
                          }
                        ],
                        "threadName": "AsyncTask #3",
                        "child": [
                          {
                            "text": "java.lang.Thread.sleep(Thread.java:450)"
                          },
                          {
                            "text": "java.lang.Thread.sleep(Thread.java:355)"
                          },
                          {
                            "text": "maxy.IntroActivity$b.a(Unknown Source:2)"
                          },
                          {
                            "text": "maxy.IntroActivity$b.doInBackground(Unknown Source:2)"
                          },
                          {
                            "text": "android.os.AsyncTask$3.call(AsyncTask.java:394)"
                          },
                          {
                            "text": "java.util.concurrent.FutureTask.run(FutureTask.java:264)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1137)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:637)"
                          },
                          {
                            "text": "java.lang.Thread.run(Thread.java:1012)"
                          }
                        ]
                      },
                      {
                        "threadName": "ThreadPoolSingl"
                      },
                      {
                        "subLine": [
                          {
                            "text": "java.lang.Object.wait(Native Method)"
                          }
                        ],
                        "threadName": "Timer-0",
                        "child": [
                          {
                            "text": "java.lang.Object.wait(Object.java:442)"
                          },
                          {
                            "text": "java.lang.Object.wait(Object.java:568)"
                          },
                          {
                            "text": "java.util.TimerThread.mainLoop(Timer.java:534)"
                          },
                          {
                            "text": "java.util.TimerThread.run(Timer.java:513)"
                          }
                        ]
                      },
                      {
                        "subLine": [
                          {
                            "text": "android.os.MessageQueue.nativePollOnce(Native Method)"
                          }
                        ],
                        "threadName": "GoogleApiHandler",
                        "child": [
                          {
                            "text": "android.os.MessageQueue.next(MessageQueue.java:335)"
                          },
                          {
                            "text": "android.os.Looper.loopOnce(Looper.java:186)"
                          },
                          {
                            "text": "android.os.Looper.loop(Looper.java:313)"
                          },
                          {
                            "text": "android.os.HandlerThread.run(HandlerThread.java:67)"
                          }
                        ]
                      },
                      {
                        "threadName": "RenderThread"
                      },
                      {
                        "threadName": "Profile Saver"
                      },
                      {
                        "subLine": [
                          {
                            "text": "android.os.MessageQueue.nativePollOnce(Native Method)"
                          }
                        ],
                        "threadName": "queued-work-looper",
                        "child": [
                          {
                            "text": "android.os.MessageQueue.next(MessageQueue.java:335)"
                          },
                          {
                            "text": "android.os.Looper.loopOnce(Looper.java:186)"
                          },
                          {
                            "text": "android.os.Looper.loop(Looper.java:313)"
                          },
                          {
                            "text": "android.os.HandlerThread.run(HandlerThread.java:67)"
                          }
                        ]
                      },
                      {
                        "subLine": [
                          {
                            "text": "jdk.internal.misc.Unsafe.park(Native Method)"
                          }
                        ],
                        "threadName": "CrAsyncTask #1",
                        "child": [
                          {
                            "text": "java.util.concurrent.locks.LockSupport.parkNanos(LockSupport.java:234)"
                          },
                          {
                            "text": "java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.awaitNanos(AbstractQueuedSynchronizer.java:2123)"
                          },
                          {
                            "text": "java.util.concurrent.ArrayBlockingQueue.poll(ArrayBlockingQueue.java:432)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1062)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1123)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:637)"
                          },
                          {
                            "text": "java.lang.Thread.run(Thread.java:1012)"
                          }
                        ]
                      },
                      {
                        "subLine": [
                          {
                            "text": "android.os.MessageQueue.nativePollOnce(Native Method)"
                          }
                        ],
                        "threadName": "Chrome_ProcessLauncherThread",
                        "child": [
                          {
                            "text": "android.os.MessageQueue.next(MessageQueue.java:335)"
                          },
                          {
                            "text": "android.os.Looper.loopOnce(Looper.java:186)"
                          },
                          {
                            "text": "android.os.Looper.loop(Looper.java:313)"
                          },
                          {
                            "text": "android.os.HandlerThread.run(HandlerThread.java:67)"
                          }
                        ]
                      },
                      {
                        "subLine": [
                          {
                            "text": "jdk.internal.misc.Unsafe.park(Native Method)"
                          }
                        ],
                        "threadName": "AsyncTask #4",
                        "child": [
                          {
                            "text": "java.util.concurrent.locks.LockSupport.parkNanos(LockSupport.java:234)"
                          },
                          {
                            "text": "java.util.concurrent.SynchronousQueue$TransferStack.awaitFulfill(SynchronousQueue.java:463)"
                          },
                          {
                            "text": "java.util.concurrent.SynchronousQueue$TransferStack.transfer(SynchronousQueue.java:361)"
                          },
                          {
                            "text": "java.util.concurrent.SynchronousQueue.poll(SynchronousQueue.java:939)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1062)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1123)"
                          },
                          {
                            "text": "java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:637)"
                          },
                          {
                            "text": "java.lang.Thread.run(Thread.java:1012)"
                          }
                        ]
                      },
                      {
                        "threadName": "Jit thread pool worker thread 0"
                      },
                      {
                        "threadName": "maindalvik.system.VMStack.getThreadStackTrace(Native Method)",
                        "child": [
                          {
                            "text": "java.lang.Thread.getStackTrace(Thread.java:1841)"
                          },
                          {
                            "text": "kr.co.miaps.mpas.MAXY.h(Unknown Source:133)"
                          },
                          {
                            "text": "kr.co.miaps.mpas.MAXY.G(Unknown Source:0)"
                          },
                          {
                            "text": "kr.co.miaps.mpas.MAXY$f.uncaughtException(Unknown Source:192)"
                          },
                          {
                            "text": "z0.a.uncaughtException(Unknown Source:20)"
                          },
                          {
                            "text": "org.chromium.base.JavaExceptionReporter.uncaughtException(chromium-TrichromeWebViewGoogle6432.aab-stable-599311233:17)"
                          },
                          {
                            "text": "java.lang.ThreadGroup.uncaughtException(ThreadGroup.java:1073)"
                          },
                          {
                            "text": "java.lang.ThreadGroup.uncaughtException(ThreadGroup.java:1068)"
                          },
                          {
                            "text": "java.lang.Thread.dispatchUncaughtException(Thread.java:2306)"
                          }
                        ]
                      }
                    ],
                    "occur": "class java.lang.NullPointerException: Attempt to invoke virtual method 'android.net.Uri android.content.Intent.getData()' on a null object reference",
                    "optional": "11-14 21:29:17.233 E/AndroidRuntime(15699): \\tat androidx.fragment.app.FragmentController.dispatchActivityCreated(Unknown Source:4)\\n11-14 21:29:17.233 E/AndroidRuntime(15699): \\tat androidx.fragment.app.FragmentActivity.onStart(Unknown Source:20)\\n11-14 21:29:17.233 E/AndroidRuntime(15699): \\tat androidx.appcompat.app.AppCompatActivity.onStart(Unknown Source:0)\\n11-14 21:29:17.233 E/AndroidRuntime(15699): \\tat android.app.Instrumentation.callActivityOnStart(Instrumentation.java:1543)\\n11-14 21:29:17.233 E/AndroidRuntime(15699): \\tat android.app.Activity.performStart(Activity.java:8682)\\n11-14 21:29:17.233 E/AndroidRuntime(15699): \\tat android.app.ActivityThread.handleStartActivity(ActivityThread.java:4219)\\n11-14 21:29:17.233 E/AndroidRuntime(15699): \\tat android.app.servertransaction.TransactionExecutor.performLifecycleSequence(TransactionExecutor.java:221)\\n11-14 21:29:17.233 E/AndroidRuntime(15699): \\tat android.app.servertransaction.TransactionExecutor.cycleToPath(TransactionExecutor.java:201)\\n11-14 21:29:17.233 E/AndroidRuntime(15699): \\tat android.app.servertransaction.TransactionExecutor.executeLifecycleState(TransactionExecutor.java:173)\\n11-14 21:29:17.233 E/AndroidRuntime(15699): \\tat android.app.servertransaction.TransactionExecutor.execute(TransactionExecutor.java:97)\\n11-14 21:29:17.233 E/AndroidRuntime(15699): \\tat android.app.ActivityThread$H.handleMessage(ActivityThread.java:2584)\\n11-14 21:29:17.233 E/AndroidRuntime(15699): \\tat android.os.Handler.dispatchMessage(Handler.java:106)\\n11-14 21:29:17.233 E/AndroidRuntime(15699): \\tat android.os.Looper.loopOnce(Looper.java:226)\\n11-14 21:29:17.233 E/AndroidRuntime(15699): \\tat android.os.Looper.loop(Looper.java:313)\\n11-14 21:29:17.233 E/AndroidRuntime(15699): \\tat android.app.ActivityThread.main(ActivityThread.java:8810)\\n11-14 21:29:17.233 E/AndroidRuntime(15699): \\tat java.lang.reflect.Method.invoke(Native Method)\\n11-14 21:29:17.233 E/AndroidRuntime(15699): \\tat com.android.internal.os.RuntimeInit$MethodAndArgsCaller.run(RuntimeInit.java:604)\\n11-14 21:29:17.233 E/AndroidRuntime(15699): \\tat com.android.internal.os.ZygoteInit.main(ZygoteInit.java:1067)\\n11-14 21:29:17.234 W/cr_media(15699): BLUETOOTH_CONNECT permission is missing.\\n11-14 21:29:17.235 W/cr_media(15699): registerBluetoothIntentsIfNeeded: Requires BLUETOOTH permission"
                  },
                  "serverType": "2",
                  "logTm": 1700026157475,
                  "loginYn": "N",
                  "deviceModel": "SM-X706N"
                }""";

        return JsonUtil.fromJson(dummyStr, typeToken);
    }

    public static Map<String, Object> makeStackTraceDummyForDownload() {
        log.debug("로그분석 -> Crash -> Download");
        Map<String, Object> result = new HashMap<>();

        result.put("appBuildNum", 165);
        result.put("deviceId", "c8b18d12-3079-3644-a28b-1ea585d313a2");
        result.put("deviceModel", "SM-X706N");
        result.put("osVer", 13);
        result.put("comType", 9);
        result.put("webviewVer", "118.0.5993.112");
        result.put("timezone", "America/Los_Angeles");
        result.put("simOperatorNm", "");
        result.put("comSensitivity", "");
        result.put("ip", "104.172.228.37");
        result.put("loginYn", "N");
        result.put("cpuUsage", "100.0");
        result.put("memUsage", 17345);
        result.put("storageUsage", 44847);
        result.put("storageTotal", 230833);
        result.put("batteryLvl", 100);
        result.put("logTm", "1700026157475");
        result.put("regDt", null);
        result.put("content", """
                class java.lang.NullPointerException: Attempt to invoke virtual method 'android.net.Uri android.content.Intent.getData()' on a null object reference
                at i7.d.x(Unknown Source:38)
                at i7.d.t(Unknown Source:8)
                at i7.d.onCreateView(Unknown Source:10)
                at androidx.fragment.app.Fragment.performCreateView(Unknown Source:19)
                at androidx.fragment.app.FragmentStateManager.createView(Unknown Source:188)
                at androidx.fragment.app.FragmentStateManager.moveToExpectedState(Unknown Source:116)
                at androidx.fragment.app.FragmentStore.moveToExpectedState(Unknown Source:30)
                at androidx.fragment.app.FragmentManager.moveToState(Unknown Source:32)
                at androidx.fragment.app.FragmentManager.dispatchStateChange(Unknown Source:9)
                at androidx.fragment.app.FragmentManager.dispatchActivityCreated(Unknown Source:11)
                at androidx.fragment.app.FragmentController.dispatchActivityCreated(Unknown Source:4)
                at androidx.fragment.app.FragmentActivity.onStart(Unknown Source:20)
                at androidx.appcompat.app.AppCompatActivity.onStart(Unknown Source:0)
                at android.app.Instrumentation.callActivityOnStart(Instrumentation.java:1543)
                at android.app.Activity.performStart(Activity.java:8682)
                at android.app.ActivityThread.handleStartActivity(ActivityThread.java:4219)
                at android.app.servertransaction.TransactionExecutor.performLifecycleSequence(TransactionExecutor.java:221)
                at android.app.servertransaction.TransactionExecutor.cycleToPath(TransactionExecutor.java:201)
                at android.app.servertransaction.TransactionExecutor.executeLifecycleState(TransactionExecutor.java:173)
                at android.app.servertransaction.TransactionExecutor.execute(TransactionExecutor.java:97)
                at android.app.ActivityThread$H.handleMessage(ActivityThread.java:2584)
                at android.os.Handler.dispatchMessage(Handler.java:106)
                at android.os.Looper.loopOnce(Looper.java:226)
                at android.os.Looper.loop(Looper.java:313)
                at android.app.ActivityThread.main(ActivityThread.java:8810)
                at java.lang.reflect.Method.invoke(Native Method)
                at com.android.internal.os.RuntimeInit$MethodAndArgsCaller.run(RuntimeInit.java:604)
                at com.android.internal.os.ZygoteInit.main(ZygoteInit.java:1067)
                
                ==========AllThreadTrace
                Thread Name: pool-5-thread-1
                android.os.BinderProxy.transactNative(Native Method)
                \tandroid.os.BinderProxy.transact(BinderProxy.java:662)
                \tandroid.content.ContentProviderProxy.query(ContentProviderNative.java:479)
                \tandroid.content.ContentResolver.query(ContentResolver.java:1226)
                \tandroid.content.ContentResolver.query(ContentResolver.java:1158)
                \tandroid.content.ContentResolver.query(ContentResolver.java:1114)
                \tcom.facebook.internal.a.h(Unknown Source:121)
                \tm0.d.e(Unknown Source:17)
                \tm0.d.b(Unknown Source:25)
                \tm0.e.k(Unknown Source:6)
                \tm0.e$c.run(Unknown Source:2)
                \tjava.util.concurrent.Executors$RunnableAdapter.call(Executors.java:463)
                \tjava.util.concurrent.FutureTask.run(FutureTask.java:264)
                \tjava.util.concurrent.ScheduledThreadPoolExecutor$ScheduledFutureTask.run(ScheduledThreadPoolExecutor.java:307)
                \tjava.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1137)
                \tjava.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:637)
                \tjava.lang.Thread.run(Thread.java:1012)
                \t
                Thread Name: Timer-2
                java.lang.Object.wait(Native Method)
                \tjava.lang.Object.wait(Object.java:442)
                \tjava.lang.Object.wait(Object.java:568)
                \tjava.util.TimerThread.mainLoop(Timer.java:534)
                \tjava.util.TimerThread.run(Timer.java:513)
                \t
                Thread Name: binder:15699_4
                
                Thread Name: MAXY_Service
                android.os.MessageQueue.nativePollOnce(Native Method)
                \tandroid.os.MessageQueue.next(MessageQueue.java:335)
                \tandroid.os.Looper.loopOnce(Looper.java:186)
                \tandroid.os.Looper.loop(Looper.java:313)
                \tandroid.os.HandlerThread.run(HandlerThread.java:67)
                \t
                Thread Name: PlatformServiceBridgeHandlerThread
                jdk.internal.misc.Unsafe.park(Native Method)
                \tjava.util.concurrent.locks.LockSupport.parkNanos(LockSupport.java:234)
                \tjava.util.concurrent.locks.AbstractQueuedSynchronizer.doAcquireSharedNanos(AbstractQueuedSynchronizer.java:1079)
                \tjava.util.concurrent.locks.AbstractQueuedSynchronizer.tryAcquireSharedNanos(AbstractQueuedSynchronizer.java:1369)
                \tjava.util.concurrent.CountDownLatch.await(CountDownLatch.java:278)
                \tWV.ES.a(chromium-TrichromeWebViewGoogle6432.aab-stable-599311233:44)
                \tWV.kH.run(chromium-TrichromeWebViewGoogle6432.aab-stable-599311233:50)
                \tandroid.os.Handler.handleCallback(Handler.java:942)
                \tandroid.os.Handler.dispatchMessage(Handler.java:99)
                \tandroid.os.Looper.loopOnce(Looper.java:226)
                \tandroid.os.Looper.loop(Looper.java:313)
                \tandroid.os.HandlerThread.run(HandlerThread.java:67)
                \t
                Thread Name: FinalizerDaemon
                java.lang.Object.wait(Native Method)
                \tjava.lang.Object.wait(Object.java:442)
                \tjava.lang.ref.ReferenceQueue.remove(ReferenceQueue.java:203)
                \tjava.lang.ref.ReferenceQueue.remove(ReferenceQueue.java:224)
                \tjava.lang.Daemons$FinalizerDaemon.runInternal(Daemons.java:300)
                \tjava.lang.Daemons$Daemon.run(Daemons.java:140)
                \tjava.lang.Thread.run(Thread.java:1012)
                \t
                Thread Name: Chrome_InProcGpuThread
                
                Thread Name: queued-work-looper-data
                jdk.internal.misc.Unsafe.park(Native Method)
                \tjava.util.concurrent.locks.LockSupport.park(LockSupport.java:194)
                \tjava.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.await(AbstractQueuedSynchronizer.java:2081)
                \tjava.util.concurrent.LinkedBlockingQueue.take(LinkedBlockingQueue.java:433)
                \tjava.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1063)
                \tjava.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1123)
                \tjava.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:637)
                \tjava.lang.Thread.run(Thread.java:1012)
                \t
                Thread Name: FinalizerWatchdogDaemon
                java.lang.Thread.sleep(Native Method)
                \tjava.lang.Thread.sleep(Thread.java:450)
                \tjava.lang.Thread.sleep(Thread.java:355)
                \tjava.lang.Daemons$FinalizerWatchdogDaemon.sleepForNanos(Daemons.java:438)
                \tjava.lang.Daemons$FinalizerWatchdogDaemon.waitForProgress(Daemons.java:480)
                \tjava.lang.Daemons$FinalizerWatchdogDaemon.runInternal(Daemons.java:369)
                \tjava.lang.Daemons$Daemon.run(Daemons.java:140)
                \tjava.lang.Thread.run(Thread.java:1012)
                \t
                Thread Name: HeapTaskDaemon
                
                Thread Name: Chrome_IOThread
                
                Thread Name: binder:15699_3
                
                Thread Name: Timer-1
                java.lang.Object.wait(Native Method)
                \tjava.lang.Object.wait(Object.java:442)
                \tjava.lang.Object.wait(Object.java:568)
                \tjava.util.TimerThread.mainLoop(Timer.java:534)
                \tjava.util.TimerThread.run(Timer.java:513)
                \t
                Thread Name: main
                dalvik.system.VMStack.getThreadStackTrace(Native Method)
                \tjava.lang.Thread.getStackTrace(Thread.java:1841)
                \tjava.lang.Thread.getAllStackTraces(Thread.java:1909)
                \tkr.co.miaps.mpas.MAXY.h(Unknown Source:5)
                \tkr.co.miaps.mpas.MAXY.G(Unknown Source:0)
                \tkr.co.miaps.mpas.MAXY$f.uncaughtException(Unknown Source:192)
                \tz0.a.uncaughtException(Unknown Source:20)
                \torg.chromium.base.JavaExceptionReporter.uncaughtException(chromium-TrichromeWebViewGoogle6432.aab-stable-599311233:17)
                \tjava.lang.ThreadGroup.uncaughtException(ThreadGroup.java:1073)
                \tjava.lang.ThreadGroup.uncaughtException(ThreadGroup.java:1068)
                \tjava.lang.Thread.dispatchUncaughtException(Thread.java:2306)
                \t
                Thread Name: hwuiTask0
                
                Thread Name: CrAsyncTask #2
                jdk.internal.misc.Unsafe.park(Native Method)
                \tjava.util.concurrent.locks.LockSupport.parkNanos(LockSupport.java:234)
                \tjava.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.awaitNanos(AbstractQueuedSynchronizer.java:2123)
                \tjava.util.concurrent.ArrayBlockingQueue.poll(ArrayBlockingQueue.java:432)
                \tjava.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1062)
                \tjava.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1123)
                \tjava.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:637)
                \tjava.lang.Thread.run(Thread.java:1012)
                \t
                Thread Name: AsyncTask #1
                android.os.BinderProxy.transactNative(Native Method)
                \tandroid.os.BinderProxy.transact(BinderProxy.java:662)
                \tandroid.content.ContentProviderProxy.query(ContentProviderNative.java:479)
                \tandroid.content.ContentResolver.query(ContentResolver.java:1226)
                \tandroid.content.ContentResolver.query(ContentResolver.java:1158)
                \tandroid.content.ContentResolver.query(ContentResolver.java:1114)
                \tcom.facebook.internal.a.h(Unknown Source:121)
                \tcom.facebook.internal.a.l(Unknown Source:0)
                \tn0.a$a.run(Unknown Source:4)
                \tjava.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1137)
                \tjava.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:637)
                \tjava.lang.Thread.run(Thread.java:1012)
                \t
                Thread Name: AsyncTask #5
                jdk.internal.misc.Unsafe.park(Native Method)
                \tjava.util.concurrent.locks.LockSupport.parkNanos(LockSupport.java:234)
                \tjava.util.concurrent.SynchronousQueue$TransferStack.awaitFulfill(SynchronousQueue.java:463)
                \tjava.util.concurrent.SynchronousQueue$TransferStack.transfer(SynchronousQueue.java:361)
                \tjava.util.concurrent.SynchronousQueue.poll(SynchronousQueue.java:939)
                \tjava.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1062)
                \tjava.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1123)
                \tjava.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:637)
                \tjava.lang.Thread.run(Thread.java:1012)
                \t
                Thread Name: InsetsAnimations
                android.os.MessageQueue.nativePollOnce(Native Method)
                \tandroid.os.MessageQueue.next(MessageQueue.java:335)
                \tandroid.os.Looper.loopOnce(Looper.java:186)
                \tandroid.os.Looper.loop(Looper.java:313)
                \tandroid.os.HandlerThread.run(HandlerThread.java:67)
                \t
                Thread Name: glide-active-resources
                java.lang.Object.wait(Native Method)
                \tjava.lang.Object.wait(Object.java:442)
                \tjava.lang.ref.ReferenceQueue.remove(ReferenceQueue.java:203)
                \tjava.lang.ref.ReferenceQueue.remove(ReferenceQueue.java:224)
                \tm.a.b(Unknown Source:6)
                \tm.a$b.run(Unknown Source:2)
                \tjava.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1137)
                \tjava.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:637)
                \tm.a$a$a.run(Unknown Source:7)
                \tjava.lang.Thread.run(Thread.java:1012)
                \t
                Thread Name: queued-work-looper-data
                jdk.internal.misc.Unsafe.park(Native Method)
                \tjava.util.concurrent.locks.LockSupport.park(LockSupport.java:194)
                \tjava.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.await(AbstractQueuedSynchronizer.java:2081)
                \tjava.util.concurrent.LinkedBlockingQueue.take(LinkedBlockingQueue.java:433)
                \tjava.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1063)
                \tjava.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1123)
                \tjava.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:637)
                \tjava.lang.Thread.run(Thread.java:1012)
                \t
                Thread Name: hwuiTask1
                
                Thread Name: MAXY_F_Worker
                e.a$c.run(Unknown Source:2)
                \t
                Thread Name: AudioThread
                
                Thread Name: pool-4-thread-1
                jdk.internal.misc.Unsafe.park(Native Method)
                \tjava.util.concurrent.locks.LockSupport.parkNanos(LockSupport.java:234)
                \tjava.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.awaitNanos(AbstractQueuedSynchronizer.java:2123)
                \tjava.util.concurrent.ScheduledThreadPoolExecutor$DelayedWorkQueue.take(ScheduledThreadPoolExecutor.java:1188)
                \tjava.util.concurrent.ScheduledThreadPoolExecutor$DelayedWorkQueue.take(ScheduledThreadPoolExecutor.java:905)
                \tjava.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1063)
                \tjava.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1123)
                \tjava.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:637)
                \tjava.lang.Thread.run(Thread.java:1012)
                \t
                Thread Name: ThreadPoolForeg
                
                Thread Name: CleanupReference
                java.lang.Object.wait(Native Method)
                \tjava.lang.Object.wait(Object.java:442)
                \tjava.lang.ref.ReferenceQueue.remove(ReferenceQueue.java:203)
                \tjava.lang.ref.ReferenceQueue.remove(ReferenceQueue.java:224)
                \tWV.md.run(chromium-TrichromeWebViewGoogle6432.aab-stable-599311233:3)
                \t
                Thread Name: OkHttp Dispatcher
                jdk.internal.misc.Unsafe.park(Native Method)
                \tjava.util.concurrent.locks.LockSupport.parkNanos(LockSupport.java:234)
                \tjava.util.concurrent.SynchronousQueue$TransferStack.awaitFulfill(SynchronousQueue.java:463)
                \tjava.util.concurrent.SynchronousQueue$TransferStack.transfer(SynchronousQueue.java:361)
                \tjava.util.concurrent.SynchronousQueue.poll(SynchronousQueue.java:939)
                \tjava.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1062)
                \tjava.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1123)
                \tjava.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:637)
                \tjava.lang.Thread.run(Thread.java:1012)
                \t
                Thread Name: queued-work-looper-data
                jdk.internal.misc.Unsafe.park(Native Method)
                \tjava.util.concurrent.locks.LockSupport.park(LockSupport.java:194)
                \tjava.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.await(AbstractQueuedSynchronizer.java:2081)
                \tjava.util.concurrent.LinkedBlockingQueue.take(LinkedBlockingQueue.java:433)
                \tjava.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1063)
                \tjava.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1123)
                \tjava.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:637)
                \tjava.lang.Thread.run(Thread.java:1012)
                \t
                Thread Name: pool-3-thread-1
                jdk.internal.misc.Unsafe.park(Native Method)
                \tjava.util.concurrent.locks.LockSupport.parkNanos(LockSupport.java:234)
                \tjava.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.awaitNanos(AbstractQueuedSynchronizer.java:2123)
                \tjava.util.concurrent.ScheduledThreadPoolExecutor$DelayedWorkQueue.take(ScheduledThreadPoolExecutor.java:1188)
                \tjava.util.concurrent.ScheduledThreadPoolExecutor$DelayedWorkQueue.take(ScheduledThreadPoolExecutor.java:905)
                \tjava.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1063)
                \tjava.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1123)
                \tjava.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:637)
                \tjava.lang.Thread.run(Thread.java:1012)
                \t
                Thread Name: Measurement Worker
                android.os.BinderProxy.transactNative(Native Method)
                \tandroid.os.BinderProxy.transact(BinderProxy.java:662)
                \tcom.google.android.gms.internal.measurement.zza.zza(Unknown Source:7)
                \tcom.google.android.gms.measurement.internal.zzen.zzc(Unknown Source:9)
                \tcom.google.android.gms.measurement.internal.zzin.run(Unknown Source:37)
                \tcom.google.android.gms.measurement.internal.zzik.zzal(Unknown Source:44)
                \tcom.google.android.gms.measurement.internal.zzik.zza(Unknown Source:11)
                \tcom.google.android.gms.measurement.internal.zzjd.run(Unknown Source:42)
                \tjava.util.concurrent.Executors$RunnableAdapter.call(Executors.java:463)
                \tjava.util.concurrent.FutureTask.run(FutureTask.java:264)
                \tcom.google.android.gms.measurement.internal.zzfy.run(Unknown Source:49)
                \t
                Thread Name: ReferenceQueueDaemon
                java.lang.Object.wait(Native Method)
                \tjava.lang.Object.wait(Object.java:442)
                \tjava.lang.Object.wait(Object.java:568)
                \tjava.lang.Daemons$ReferenceQueueDaemon.runInternal(Daemons.java:232)
                \tjava.lang.Daemons$Daemon.run(Daemons.java:140)
                \tjava.lang.Thread.run(Thread.java:1012)
                \t
                Thread Name: logGather Timer
                java.lang.Object.wait(Native Method)
                \tjava.lang.Object.wait(Object.java:442)
                \tjava.util.TimerThread.mainLoop(Timer.java:560)
                \tjava.util.TimerThread.run(Timer.java:513)
                \t
                Thread Name: [MAXY-ANR-ERROR]
                java.lang.Thread.sleep(Native Method)
                \tjava.lang.Thread.sleep(Thread.java:450)
                \tjava.lang.Thread.sleep(Thread.java:355)
                \ta3.b.run(Unknown Source:40)
                \t
                Thread Name: binder:15699_2
                
                Thread Name: ThreadPoolForeg
                
                Thread Name: Signal Catcher
                
                Thread Name: AsyncTask #6
                jdk.internal.misc.Unsafe.park(Native Method)
                \tjava.util.concurrent.locks.LockSupport.parkNanos(LockSupport.java:234)
                \tjava.util.concurrent.SynchronousQueue$TransferStack.awaitFulfill(SynchronousQueue.java:463)
                \tjava.util.concurrent.SynchronousQueue$TransferStack.transfer(SynchronousQueue.java:361)
                \tjava.util.concurrent.SynchronousQueue.poll(SynchronousQueue.java:939)
                \tjava.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1062)
                \tjava.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1123)
                \tjava.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:637)
                \tjava.lang.Thread.run(Thread.java:1012)
                \t
                Thread Name: queued-work-looper-data
                jdk.internal.misc.Unsafe.park(Native Method)
                \tjava.util.concurrent.locks.LockSupport.park(LockSupport.java:194)
                \tjava.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.await(AbstractQueuedSynchronizer.java:2081)
                \tjava.util.concurrent.LinkedBlockingQueue.take(LinkedBlockingQueue.java:433)
                \tjava.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1063)
                \tjava.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1123)
                \tjava.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:637)
                \tjava.lang.Thread.run(Thread.java:1012)
                \t
                Thread Name: firebase-iid-executor
                jdk.internal.misc.Unsafe.park(Native Method)
                \tjava.util.concurrent.locks.LockSupport.parkNanos(LockSupport.java:234)
                \tjava.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.awaitNanos(AbstractQueuedSynchronizer.java:2123)
                \tjava.util.concurrent.LinkedBlockingQueue.poll(LinkedBlockingQueue.java:458)
                \tjava.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1062)
                \tjava.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1123)
                \tjava.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:637)
                \tjava.lang.Thread.run(Thread.java:1012)
                \t
                Thread Name: Timer-3
                java.lang.Object.wait(Native Method)
                \tjava.lang.Object.wait(Object.java:442)
                \tjava.lang.Object.wait(Object.java:568)
                \tjava.util.TimerThread.mainLoop(Timer.java:534)
                \tjava.util.TimerThread.run(Timer.java:513)
                \t
                Thread Name: AsyncTask #2
                android.os.BinderProxy.transactNative(Native Method)
                \tandroid.os.BinderProxy.transact(BinderProxy.java:662)
                \tandroid.content.ContentProviderProxy.query(ContentProviderNative.java:479)
                \tandroid.content.ContentResolver.query(ContentResolver.java:1226)
                \tandroid.content.ContentResolver.query(ContentResolver.java:1158)
                \tandroid.content.ContentResolver.query(ContentResolver.java:1114)
                \tcom.facebook.internal.a.h(Unknown Source:121)
                \tcom.facebook.o.y(Unknown Source:4)
                \tcom.facebook.o$e.run(Unknown Source:4)
                \tjava.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1137)
                \tjava.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:637)
                \tjava.lang.Thread.run(Thread.java:1012)
                \t
                Thread Name: binder:15699_1
                
                Thread Name: AsyncTask #3
                java.lang.Thread.sleep(Native Method)
                \tjava.lang.Thread.sleep(Thread.java:450)
                \tjava.lang.Thread.sleep(Thread.java:355)
                \tmaxy.IntroActivity$b.a(Unknown Source:2)
                \tmaxy.IntroActivity$b.doInBackground(Unknown Source:2)
                \tandroid.os.AsyncTask$3.call(AsyncTask.java:394)
                \tjava.util.concurrent.FutureTask.run(FutureTask.java:264)
                \tjava.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1137)
                \tjava.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:637)
                \tjava.lang.Thread.run(Thread.java:1012)
                \t
                Thread Name: ThreadPoolSingl
                
                Thread Name: Timer-0
                java.lang.Object.wait(Native Method)
                \tjava.lang.Object.wait(Object.java:442)
                \tjava.lang.Object.wait(Object.java:568)
                \tjava.util.TimerThread.mainLoop(Timer.java:534)
                \tjava.util.TimerThread.run(Timer.java:513)
                \t
                Thread Name: GoogleApiHandler
                android.os.MessageQueue.nativePollOnce(Native Method)
                \tandroid.os.MessageQueue.next(MessageQueue.java:335)
                \tandroid.os.Looper.loopOnce(Looper.java:186)
                \tandroid.os.Looper.loop(Looper.java:313)
                \tandroid.os.HandlerThread.run(HandlerThread.java:67)
                \t
                Thread Name: RenderThread
                
                Thread Name: Profile Saver
                
                Thread Name: queued-work-looper
                android.os.MessageQueue.nativePollOnce(Native Method)
                \tandroid.os.MessageQueue.next(MessageQueue.java:335)
                \tandroid.os.Looper.loopOnce(Looper.java:186)
                \tandroid.os.Looper.loop(Looper.java:313)
                \tandroid.os.HandlerThread.run(HandlerThread.java:67)
                \t
                Thread Name: CrAsyncTask #1
                jdk.internal.misc.Unsafe.park(Native Method)
                \tjava.util.concurrent.locks.LockSupport.parkNanos(LockSupport.java:234)
                \tjava.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.awaitNanos(AbstractQueuedSynchronizer.java:2123)
                \tjava.util.concurrent.ArrayBlockingQueue.poll(ArrayBlockingQueue.java:432)
                \tjava.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1062)
                \tjava.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1123)
                \tjava.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:637)
                \tjava.lang.Thread.run(Thread.java:1012)
                \t
                Thread Name: Chrome_ProcessLauncherThread
                android.os.MessageQueue.nativePollOnce(Native Method)
                \tandroid.os.MessageQueue.next(MessageQueue.java:335)
                \tandroid.os.Looper.loopOnce(Looper.java:186)
                \tandroid.os.Looper.loop(Looper.java:313)
                \tandroid.os.HandlerThread.run(HandlerThread.java:67)
                \t
                Thread Name: AsyncTask #4
                jdk.internal.misc.Unsafe.park(Native Method)
                \tjava.util.concurrent.locks.LockSupport.parkNanos(LockSupport.java:234)
                \tjava.util.concurrent.SynchronousQueue$TransferStack.awaitFulfill(SynchronousQueue.java:463)
                \tjava.util.concurrent.SynchronousQueue$TransferStack.transfer(SynchronousQueue.java:361)
                \tjava.util.concurrent.SynchronousQueue.poll(SynchronousQueue.java:939)
                \tjava.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1062)
                \tjava.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1123)
                \tjava.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:637)
                \tjava.lang.Thread.run(Thread.java:1012)
                \t
                Thread Name: Jit thread pool worker thread 0
                
                
                Thread Name: maindalvik.system.VMStack.getThreadStackTrace(Native Method)
                \tjava.lang.Thread.getStackTrace(Thread.java:1841)
                \tkr.co.miaps.mpas.MAXY.h(Unknown Source:133)
                \tkr.co.miaps.mpas.MAXY.G(Unknown Source:0)
                \tkr.co.miaps.mpas.MAXY$f.uncaughtException(Unknown Source:192)
                \tz0.a.uncaughtException(Unknown Source:20)
                \torg.chromium.base.JavaExceptionReporter.uncaughtException(chromium-TrichromeWebViewGoogle6432.aab-stable-599311233:17)
                \tjava.lang.ThreadGroup.uncaughtException(ThreadGroup.java:1073)
                \tjava.lang.ThreadGroup.uncaughtException(ThreadGroup.java:1068)
                \tjava.lang.Thread.dispatchUncaughtException(Thread.java:2306)
                \t
                
                ==========Logcat
                11-14 21:29:17.233 E/AndroidRuntime(15699): \tat androidx.fragment.app.FragmentController.dispatchActivityCreated(Unknown Source:4)
                11-14 21:29:17.233 E/AndroidRuntime(15699): \tat androidx.fragment.app.FragmentActivity.onStart(Unknown Source:20)
                11-14 21:29:17.233 E/AndroidRuntime(15699): \tat androidx.appcompat.app.AppCompatActivity.onStart(Unknown Source:0)
                11-14 21:29:17.233 E/AndroidRuntime(15699): \tat android.app.Instrumentation.callActivityOnStart(Instrumentation.java:1543)
                11-14 21:29:17.233 E/AndroidRuntime(15699): \tat android.app.Activity.performStart(Activity.java:8682)
                11-14 21:29:17.233 E/AndroidRuntime(15699): \tat android.app.ActivityThread.handleStartActivity(ActivityThread.java:4219)
                11-14 21:29:17.233 E/AndroidRuntime(15699): \tat android.app.servertransaction.TransactionExecutor.performLifecycleSequence(TransactionExecutor.java:221)
                11-14 21:29:17.233 E/AndroidRuntime(15699): \tat android.app.servertransaction.TransactionExecutor.cycleToPath(TransactionExecutor.java:201)
                11-14 21:29:17.233 E/AndroidRuntime(15699): \tat android.app.servertransaction.TransactionExecutor.executeLifecycleState(TransactionExecutor.java:173)
                11-14 21:29:17.233 E/AndroidRuntime(15699): \tat android.app.servertransaction.TransactionExecutor.execute(TransactionExecutor.java:97)
                11-14 21:29:17.233 E/AndroidRuntime(15699): \tat android.app.ActivityThread$H.handleMessage(ActivityThread.java:2584)
                11-14 21:29:17.233 E/AndroidRuntime(15699): \tat android.os.Handler.dispatchMessage(Handler.java:106)
                11-14 21:29:17.233 E/AndroidRuntime(15699): \tat android.os.Looper.loopOnce(Looper.java:226)
                11-14 21:29:17.233 E/AndroidRuntime(15699): \tat android.os.Looper.loop(Looper.java:313)
                11-14 21:29:17.233 E/AndroidRuntime(15699): \tat android.app.ActivityThread.main(ActivityThread.java:8810)
                11-14 21:29:17.233 E/AndroidRuntime(15699): \tat java.lang.reflect.Method.invoke(Native Method)
                11-14 21:29:17.233 E/AndroidRuntime(15699): \tat com.android.internal.os.RuntimeInit$MethodAndArgsCaller.run(RuntimeInit.java:604)
                11-14 21:29:17.233 E/AndroidRuntime(15699): \tat com.android.internal.os.ZygoteInit.main(ZygoteInit.java:1067)
                11-14 21:29:17.234 W/cr_media(15699): BLUETOOTH_CONNECT permission is missing.
                11-14 21:29:17.235 W/cr_media(15699): registerBluetoothIntentsIfNeeded: Requires BLUETOOTH permission""");

        return result;
    }


    public static List<Map<String, Object>> makeLogStackDummy() {
        String dummyStr1 = """
                {
                  "seq": 0,
                  "deviceId": "fa50e257-5a51-39c0-a05b-06b293b61ff3",
                  "packageNm": "maxy",
                  "logTm": 1700518830281,
                  "logType": 8388611,
                  "serverType": "2",
                  "logTypeNm": "Ajax",
                  "logTypeDnm": "Send",
                  "logDt": null,
                  "comType": "1",
                  "simOperatorNm": "",
                  "osType": "Android",
                  "osVer": "9",
                  "appVer": "1.6.5",
                  "deviceModel": "SM-J530L",
                  "memUsage": 8908,
                  "cpuUsage": 50,
                  "storageTotal": 25881,
                  "storageUsage": 25165,
                  "comSensitivity": "90",
                  "batteryLvl": "100",
                  "reqUrl": "/setSessionForApp?pushId=",
                  "method": null,
                  "resMsg": "",
                  "timezone": "Asia/Seoul",
                  "webviewVer": "119.0.6045.163",
                  "appBuildNum": "165",
                  "referer": "",
                  "ip": "182.211.183.16",
                  "intervaltime": 0,
                  "regDt": null,
                  "logYear": "2023",
                  "logMonth": "11",
                  "logDate": "21",
                  "loginYn": "Y",
                  "logStartTm": 0,
                  "logEndTm": 0,
                  "aliasValue": "/setSessionForApp?pushId=",
                  "geoip": null,
                  "vipYn": null,
                  "emailAddr": null,
                  "phoneNo": null,
                  "sex": null,
                  "userNm": null,
                  "userId": null,
                  "residence": null,
                  "cntryCd": null,
                  "birthDay": null,
                  "maxySessionId": "",
                  "webOnlyYn": "N"
                }""";
        String dummyStr2 = """
                {
                  "seq": 0,
                  "deviceId": "fa50e257-5a51-39c0-a05b-06b293b61ff3",
                  "packageNm": "maxy",
                  "logTm": 1700518830321,
                  "logType": 8388612,
                  "serverType": "2",
                  "logTypeNm": "Ajax",
                  "logTypeDnm": "Response",
                  "logDt": null,
                  "comType": "1",
                  "simOperatorNm": "",
                  "osType": "Android",
                  "osVer": "9",
                  "appVer": "1.6.5",
                  "deviceModel": "SM-J530L",
                  "memUsage": 8956,
                  "cpuUsage": 50,
                  "storageTotal": 25881,
                  "storageUsage": 25165,
                  "comSensitivity": "90",
                  "batteryLvl": "100",
                  "reqUrl": "/setSessionForApp?pushId=",
                  "method": null,
                  "resMsg": "",
                  "timezone": "Asia/Seoul",
                  "webviewVer": "119.0.6045.163",
                  "appBuildNum": "165",
                  "referer": "",
                  "ip": "182.211.183.16",
                  "intervaltime": 41,
                  "regDt": null,
                  "logYear": "2023",
                  "logMonth": "11",
                  "logDate": "21",
                  "loginYn": "Y",
                  "logStartTm": 0,
                  "logEndTm": 0,
                  "aliasValue": "/setSessionForApp?pushId=",
                  "geoip": null,
                  "vipYn": null,
                  "emailAddr": null,
                  "phoneNo": null,
                  "sex": null,
                  "userNm": null,
                  "userId": null,
                  "residence": null,
                  "cntryCd": null,
                  "birthDay": null,
                  "maxySessionId": "",
                  "webOnlyYn": "N"
                }""";
        String dummyStr3 = """
                {
                  "seq": 0,
                  "deviceId": "fa50e257-5a51-39c0-a05b-06b293b61ff3",
                  "packageNm": "maxy",
                  "logTm": 1700518832021,
                  "logType": 131088,
                  "serverType": "2",
                  "logTypeNm": "WebNavigation",
                  "logTypeDnm": "Click",
                  "logDt": null,
                  "comType": "1",
                  "simOperatorNm": "",
                  "osType": "Android",
                  "osVer": "9",
                  "appVer": "1.6.5",
                  "deviceModel": "SM-J530L",
                  "memUsage": 9020,
                  "cpuUsage": 38,
                  "storageTotal": 25881,
                  "storageUsage": 25165,
                  "comSensitivity": "90",
                  "batteryLvl": "100",
                  "reqUrl": "https://mid.ebs.co.kr/course/view?courseId=10030778&left=series",
                  "method": null,
                  "resMsg": "{\\"action\\":\\"click\\",\\"tagName\\":\\"a\\",\\"elementName\\":\\"a.btn_study2_play\\"}",
                  "timezone": "Asia/Seoul",
                  "webviewVer": "119.0.6045.163",
                  "appBuildNum": "165",
                  "referer": "",
                  "ip": "182.211.183.16",
                  "intervaltime": 0,
                  "regDt": null,
                  "logYear": "2023",
                  "logMonth": "11",
                  "logDate": "21",
                  "loginYn": "Y",
                  "logStartTm": 0,
                  "logEndTm": 0,
                  "aliasValue": "/course/view",
                  "geoip": null,
                  "vipYn": null,
                  "emailAddr": null,
                  "phoneNo": null,
                  "sex": null,
                  "userNm": null,
                  "userId": null,
                  "residence": null,
                  "cntryCd": null,
                  "birthDay": null,
                  "maxySessionId": "",
                  "webOnlyYn": "N"
                }""";
        String dummyStr4 = """
                {
                  "seq": 0,
                  "deviceId": "fa50e257-5a51-39c0-a05b-06b293b61ff3",
                  "packageNm": "maxy",
                  "logTm": 1700518833262,
                  "logType": 8388609,
                  "serverType": "2",
                  "logTypeNm": "Ajax",
                  "logTypeDnm": "Submit",
                  "logDt": null,
                  "comType": "1",
                  "simOperatorNm": "",
                  "osType": "Android",
                  "osVer": "9",
                  "appVer": "1.6.5",
                  "deviceModel": "SM-J530L",
                  "memUsage": 9263,
                  "cpuUsage": 38,
                  "storageTotal": 25881,
                  "storageUsage": 25165,
                  "comSensitivity": "90",
                  "batteryLvl": "100",
                  "reqUrl": "https://mid.ebs.co.kr/course/step/add",
                  "method": null,
                  "resMsg": "",
                  "timezone": "Asia/Seoul",
                  "webviewVer": "119.0.6045.163",
                  "appBuildNum": "165",
                  "referer": "",
                  "ip": "182.211.183.16",
                  "intervaltime": 0,
                  "regDt": null,
                  "logYear": "2023",
                  "logMonth": "11",
                  "logDate": "21",
                  "loginYn": "Y",
                  "logStartTm": 0,
                  "logEndTm": 0,
                  "aliasValue": "/course/step/add",
                  "geoip": null,
                  "vipYn": null,
                  "emailAddr": null,
                  "phoneNo": null,
                  "sex": null,
                  "userNm": null,
                  "userId": null,
                  "residence": null,
                  "cntryCd": null,
                  "birthDay": null,
                  "maxySessionId": "",
                  "webOnlyYn": "N"
                }""";
        String dummyStr5 = """
                {
                  "seq": 0,
                  "deviceId": "fa50e257-5a51-39c0-a05b-06b293b61ff3",
                  "packageNm": "maxy",
                  "logTm": 1700518833858,
                  "logType": 131093,
                  "serverType": "2",
                  "logTypeNm": "WebNavigation",
                  "logTypeDnm": "Page Hide",
                  "logDt": null,
                  "comType": "1",
                  "simOperatorNm": "",
                  "osType": "Android",
                  "osVer": "9",
                  "appVer": "1.6.5",
                  "deviceModel": "SM-J530L",
                  "memUsage": 9359,
                  "cpuUsage": 17,
                  "storageTotal": 25881,
                  "storageUsage": 25165,
                  "comSensitivity": "90",
                  "batteryLvl": "100",
                  "reqUrl": "https://mid.ebs.co.kr/course/view?courseId=10030778&left=series",
                  "method": null,
                  "resMsg": "",
                  "timezone": "Asia/Seoul",
                  "webviewVer": "119.0.6045.163",
                  "appBuildNum": "165",
                  "referer": "",
                  "ip": "182.211.183.16",
                  "intervaltime": 0,
                  "regDt": null,
                  "logYear": "2023",
                  "logMonth": "11",
                  "logDate": "21",
                  "loginYn": "Y",
                  "logStartTm": 0,
                  "logEndTm": 0,
                  "aliasValue": "/course/view",
                  "geoip": null,
                  "vipYn": null,
                  "emailAddr": null,
                  "phoneNo": null,
                  "sex": null,
                  "userNm": null,
                  "userId": null,
                  "residence": null,
                  "cntryCd": null,
                  "birthDay": null,
                  "maxySessionId": "",
                  "webOnlyYn": "N"
                }""";
        String dummyStr6 = """
                {
                  "seq": 0,
                  "deviceId": "fa50e257-5a51-39c0-a05b-06b293b61ff3",
                  "packageNm": "maxy",
                  "logTm": 1700518833862,
                  "logType": 131096,
                  "serverType": "2",
                  "logTypeNm": "WebNavigation",
                  "logTypeDnm": "Page Unload",
                  "logDt": null,
                  "comType": "1",
                  "simOperatorNm": "",
                  "osType": "Android",
                  "osVer": "9",
                  "appVer": "1.6.5",
                  "deviceModel": "SM-J530L",
                  "memUsage": 9407,
                  "cpuUsage": 33,
                  "storageTotal": 25881,
                  "storageUsage": 25165,
                  "comSensitivity": "90",
                  "batteryLvl": "100",
                  "reqUrl": "https://mid.ebs.co.kr/course/view?courseId=10030778&left=series",
                  "method": null,
                  "resMsg": "",
                  "timezone": "Asia/Seoul",
                  "webviewVer": "119.0.6045.163",
                  "appBuildNum": "165",
                  "referer": "",
                  "ip": "182.211.183.16",
                  "intervaltime": 0,
                  "regDt": null,
                  "logYear": "2023",
                  "logMonth": "11",
                  "logDate": "21",
                  "loginYn": "Y",
                  "logStartTm": 0,
                  "logEndTm": 0,
                  "aliasValue": "/course/view",
                  "geoip": null,
                  "vipYn": null,
                  "emailAddr": null,
                  "phoneNo": null,
                  "sex": null,
                  "userNm": null,
                  "userId": null,
                  "residence": null,
                  "cntryCd": null,
                  "birthDay": null,
                  "maxySessionId": "",
                  "webOnlyYn": "N"
                }""";
        String dummyStr7 = """
                {
                  "seq": 0,
                  "deviceId": "fa50e257-5a51-39c0-a05b-06b293b61ff3",
                  "packageNm": "maxy",
                  "logTm": 1700518833945,
                  "logType": 131073,
                  "serverType": "2",
                  "logTypeNm": "WebNavigation",
                  "logTypeDnm": "Start",
                  "logDt": null,
                  "comType": "1",
                  "simOperatorNm": "",
                  "osType": "Android",
                  "osVer": "9",
                  "appVer": "1.6.5",
                  "deviceModel": "SM-J530L",
                  "memUsage": 9487,
                  "cpuUsage": 50,
                  "storageTotal": 25881,
                  "storageUsage": 25165,
                  "comSensitivity": "90",
                  "batteryLvl": "100",
                  "reqUrl": "https://mid.ebs.co.kr/course/view?courseId=10030778&left=series",
                  "method": null,
                  "resMsg": "",
                  "timezone": "Asia/Seoul",
                  "webviewVer": "119.0.6045.163",
                  "appBuildNum": "165",
                  "referer": "",
                  "ip": "182.211.183.16",
                  "intervaltime": 0,
                  "regDt": null,
                  "logYear": "2023",
                  "logMonth": "11",
                  "logDate": "21",
                  "loginYn": "Y",
                  "logStartTm": 0,
                  "logEndTm": 0,
                  "aliasValue": "/course/view?courseId=10030778",
                  "geoip": null,
                  "vipYn": null,
                  "emailAddr": null,
                  "phoneNo": null,
                  "sex": null,
                  "userNm": null,
                  "userId": null,
                  "residence": null,
                  "cntryCd": null,
                  "birthDay": null,
                  "maxySessionId": "",
                  "webOnlyYn": "N"
                }""";
        String dummyStr8 = """
                {
                  "seq": 0,
                  "deviceId": "fa50e257-5a51-39c0-a05b-06b293b61ff3",
                  "packageNm": "maxy",
                  "logTm": 1700518838863,
                  "logType": 131075,
                  "serverType": "2",
                  "logTypeNm": "WebNavigation",
                  "logTypeDnm": "End",
                  "logDt": null,
                  "comType": "1",
                  "simOperatorNm": "",
                  "osType": "Android",
                  "osVer": "9",
                  "appVer": "1.6.5",
                  "deviceModel": "SM-J530L",
                  "memUsage": 11350,
                  "cpuUsage": 50,
                  "storageTotal": 25881,
                  "storageUsage": 25164,
                  "comSensitivity": "90",
                  "batteryLvl": "100",
                  "reqUrl": "https://mid.ebs.co.kr/course/view?courseId=10030778&left=series",
                  "method": null,
                  "resMsg": "",
                  "timezone": "Asia/Seoul",
                  "webviewVer": "119.0.6045.163",
                  "appBuildNum": "165",
                  "referer": "",
                  "ip": "182.211.183.16",
                  "intervaltime": 4919,
                  "regDt": null,
                  "logYear": "2023",
                  "logMonth": "11",
                  "logDate": "21",
                  "loginYn": "Y",
                  "logStartTm": 0,
                  "logEndTm": 0,
                  "aliasValue": "/course/view",
                  "geoip": null,
                  "vipYn": null,
                  "emailAddr": null,
                  "phoneNo": null,
                  "sex": null,
                  "userNm": null,
                  "userId": null,
                  "residence": null,
                  "cntryCd": null,
                  "birthDay": null,
                  "maxySessionId": "",
                  "webOnlyYn": "N"
                }""";
        String dummyStr9 = """
                {
                  "seq": 0,
                  "deviceId": "fa50e257-5a51-39c0-a05b-06b293b61ff3",
                  "packageNm": "maxy",
                  "logTm": 1700518844862,
                  "logType": 4194305,
                  "serverType": "2",
                  "logTypeNm": "Custom Tag",
                  "logTypeDnm": "Common",
                  "logDt": null,
                  "comType": "1",
                  "simOperatorNm": "",
                  "osType": "Android",
                  "osVer": "9",
                  "appVer": "1.6.5",
                  "deviceModel": "SM-J530L",
                  "memUsage": 13655,
                  "cpuUsage": 95,
                  "storageTotal": 25881,
                  "storageUsage": 25164,
                  "comSensitivity": "90",
                  "batteryLvl": "100",
                  "reqUrl": "customkey",
                  "method": null,
                  "resMsg": "{\\"open-download-play\\":\\"플레이어 강의 오픈\\"}",
                  "timezone": "Asia/Seoul",
                  "webviewVer": "119.0.6045.163",
                  "appBuildNum": "165",
                  "referer": "",
                  "ip": "182.211.183.16",
                  "intervaltime": 0,
                  "regDt": null,
                  "logYear": "2023",
                  "logMonth": "11",
                  "logDate": "21",
                  "loginYn": "Y",
                  "logStartTm": 0,
                  "logEndTm": 0,
                  "aliasValue": "customkey",
                  "geoip": null,
                  "vipYn": null,
                  "emailAddr": null,
                  "phoneNo": null,
                  "sex": null,
                  "userNm": null,
                  "userId": null,
                  "residence": null,
                  "cntryCd": null,
                  "birthDay": null,
                  "maxySessionId": "",
                  "webOnlyYn": "N"
                }""";
        String dummyStr10 = """
                {
                  "seq": 0,
                  "deviceId": "fa50e257-5a51-39c0-a05b-06b293b61ff3",
                  "packageNm": "maxy",
                  "logTm": 1700518854862,
                  "logType": 1048582,
                  "serverType": "2",
                  "logTypeNm": "NativeAction",
                  "logTypeDnm": "App Background",
                  "logDt": null,
                  "comType": "1",
                  "simOperatorNm": "",
                  "osType": "Android",
                  "osVer": "9",
                  "appVer": "1.6.5",
                  "deviceModel": "SM-J530L",
                  "memUsage": 15249,
                  "cpuUsage": 100,
                  "storageTotal": 25881,
                  "storageUsage": 25159,
                  "comSensitivity": "90",
                  "batteryLvl": "94",
                  "reqUrl": "Background",
                  "method": null,
                  "resMsg": "",
                  "timezone": "Asia/Seoul",
                  "webviewVer": "119.0.6045.163",
                  "appBuildNum": "165",
                  "referer": "",
                  "ip": "182.211.183.16",
                  "intervaltime": 0,
                  "regDt": null,
                  "logYear": "2023",
                  "logMonth": "11",
                  "logDate": "21",
                  "loginYn": "Y",
                  "logStartTm": 0,
                  "logEndTm": 0,
                  "aliasValue": "Background",
                  "geoip": null,
                  "vipYn": null,
                  "emailAddr": null,
                  "phoneNo": null,
                  "sex": null,
                  "userNm": null,
                  "userId": null,
                  "residence": null,
                  "cntryCd": null,
                  "birthDay": null,
                  "maxySessionId": "",
                  "webOnlyYn": "N"
                }""";
        String dummyStr11 = """
                {
                  "seq": 0,
                  "deviceId": "fa50e257-5a51-39c0-a05b-06b293b61ff3",
                  "packageNm": "maxy",
                  "logTm": 1700518874862,
                  "logType": 2097152,
                  "serverType": "2",
                  "logTypeNm": "Native",
                  "logTypeDnm": "Crash",
                  "logDt": null,
                  "comType": "1",
                  "simOperatorNm": "",
                  "osType": "Android",
                  "osVer": "9",
                  "appVer": "1.6.5",
                  "deviceModel": "SM-J530L",
                  "memUsage": 6179,
                  "cpuUsage": 78,
                  "storageTotal": 25881,
                  "storageUsage": 25137,
                  "comSensitivity": "90",
                  "batteryLvl": "79",
                  "reqUrl": "",
                  "method": null,
                  "resMsg": "class java.lang.InternalError: Thread starting during runtime shutdown|at java.lang.Thread.nativeCreate(Native Method)|at java.lang.Thread.start(Thread.java:733)|at java.util.concurrent.ThreadPoolExecutor.addWorker(ThreadPoolExecutor.java:975)|at java.util.concurrent.ThreadPoolExecutor.processWorkerExit(ThreadPoolExecutor.java:1043)|at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1185)|at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:641)|at java.lang.Thread.run(Thread.java:764)||==========AllThreadTrace|Thread Name: AsyncTask #3|java.lang.System.arraycopy(Native Method)|\\tjava.util.Arrays.copyOf(Arrays.java:3261)|\\tjava.lang.AbstractStringBuilder.ensureCapacityInternal(AbstractStringBuilder.java:125)|\\tjava.lang.AbstractStringBuilder.append(AbstractStringBuilder.java:451)|\\tjava.lang.StringBuilder.append(StringBuilder.java:137)|\\tkr.co.miaps.mpas.MAXY.h(Unknown Source:76)|\\tkr.co.miaps.mpas.MAXY.G(Unknown Source:0)|\\tkr.co.miaps.mpas.MAXY$f.uncaughtException(Unknown Source:192)|\\tjava.lang.ThreadGroup.uncaughtException(ThreadGroup.java:1068)|\\tjava.lang.ThreadGroup.uncaughtException(ThreadGroup.java:1063)|\\tjava.lang.Thread.dispatchUncaughtException(Thread.java:1955)|\\t|Thread Name: [MAXY-ANR-ERROR]|java.lang.Thread.sleep(Native Method)|\\tjava.lang.Thread.sleep(Thread.java:373)|\\tjava.lang.Thread.sleep(Thread.java:314)|\\ta3.b.run(Unknown Source:40)|\\t|Thread Name: AsyncTask #2|dalvik.system.VMStack.getThreadStackTrace(Native Method)|\\tjava.lang.Thread.getStackTrace(Thread.java:1538)|\\tjava.lang.Thread.getAllStackTraces(Thread.java:1588)|\\tkr.co.miaps.mpas.MAXY.h(Unknown Source:5)|\\tkr.co.miaps.mpas.MAXY.G(Unknown Source:0)|\\tkr.co.miaps.mpas.MAXY$f.uncaughtException(Unknown Source:192)|\\tjava.lang.ThreadGroup.uncaughtException(ThreadGroup.java:1068)|\\tjava.lang.ThreadGroup.uncaughtException(ThreadGroup.java:1063)|\\tjava.lang.Thread.dispatchUncaughtException(Thread.java:1955)|\\t|Thread Name: AsyncTask #1|dalvik.system.VMStack.getThreadStackTrace(Native Method)|\\tjava.lang.Thread.getStackTrace(Thread.java:1538)|\\tjava.lang.Thread.getAllStackTraces(Thread.java:1588)|\\tkr.co.miaps.mpas.MAXY.h(Unknown Source:5)|\\tkr.co.miaps.mpas.MAXY.G(Unknown Source:0)|\\tkr.co.miaps.mpas.MAXY$f.uncaughtException(Unknown Source:192)|\\tjava.lang.ThreadGroup.uncaughtException(ThreadGroup.java:1068)|\\tjava.lang.ThreadGroup.uncaughtException(ThreadGroup.java:1063)|\\tjava.lang.Thread.dispatchUncaughtException(Thread.java:1955)|\\t|Thread Name: Binder:31451_1||Thread Name: AsyncTask #4|java.lang.Object.wait(Native Method)|\\tjava.lang.Thread.parkFor$(Thread.java:2137)|\\tsun.misc.Unsafe.park(Unsafe.java:358)|\\tjava.util.concurrent.locks.LockSupport.parkNanos(LockSupport.java:230)|\\tjava.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.awaitNanos(AbstractQueuedSynchronizer.java:2101)|\\tjava.util.concurrent.LinkedBlockingQueue.poll(LinkedBlockingQueue.java:467)|\\tjava.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1091)|\\tjava.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1152)|\\tjava.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:641)|\\tjava.lang.Thread.run(Thread.java:764)|\\t|Thread Name: process reaper|java.lang.Object.wait(Native Method)|\\tjava.lang.Thread.parkFor$(Thread.java:2137)|\\tsun.misc.Unsafe.park(Unsafe.java:358)|\\tjava.util.concurrent.locks.LockSupport.parkNanos(LockSupport.java:230)|\\tjava.util.concurrent.SynchronousQueue$TransferStack.awaitFulfill(SynchronousQueue.java:461)|\\tjava.util.concurrent.SynchronousQueue$TransferStack.transfer(SynchronousQueue.java:362)|\\tjava.util.concurrent.SynchronousQueue.poll(SynchronousQueue.java:937)|\\tjava.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1091)|\\tjava.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1152)|\\tjava.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:641)|\\tjava.lang.Thread.run(Thread.java:764)|\\t|Thread Name: pool-2-thread-1|java.lang.Object.wait(Native Method)|\\tjava.lang.Thread.parkFor$(Thread.java:2137)|\\tsun.misc.Unsafe.park(Unsafe.java:358)|\\tjava.util.concurrent.locks.LockSupport.parkNanos(LockSupport.java:230)|\\tjava.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.awaitNanos(AbstractQueuedSynchronizer.java:2101)|\\tjava.util.concurrent.ScheduledThreadPoolExecutor$DelayedWorkQueue.take(ScheduledThreadPoolExecutor.java:1132)|\\tjava.util.concurrent.ScheduledThreadPoolExecutor$DelayedWorkQueue.take(ScheduledThreadPoolExecutor.java:849)|\\tjava.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1092)|\\tjava.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1152)|\\tjava.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:641)|\\tjava.lang.Thread.run(Thread.java:764)|\\t|Thread Name: ExoPlayerImplInternal:Handler|android.os.MessageQueue.nativePollOnce(Native Method)|\\tandroid.os.MessageQueue.next(MessageQueue.java:326)|\\tandroid.os.Looper.loop(Looper.java:183)|\\tandroid.os.HandlerThread.run(HandlerThread.java:65)|\\t|Thread Name: Binder:31451_3||Thread Name: Measurement Worker|java.lang.Object.wait(Native Method)|\\tjava.lang.Object.wait(Object.java:422)|\\tcom.google.android.gms.measurement.internal.zzfy.run(Unknown Source:76)|\\t|Thread Name: ChoreographerOwner:Handler|android.os.MessageQueue.nativePollOnce(Native Method)|\\tandroid.os.MessageQueue.next(MessageQueue.java:326)|\\tandroid.os.Looper.loop(Looper.java:183)|\\tandroid.os.HandlerThread.run(HandlerThread.java:65)|\\t|Thread Name: Binder:31451_2||Thread Name: firebase-iid-executor|java.lang.Object.wait(Native Method)|\\tjava.lang.Thread.parkFor$(Thread.java:2137)|\\tsun.misc.Unsafe.park(Unsafe.java:358)|\\tjava.util.concurrent.locks.LockSupport.parkNanos(LockSupport.java:230)|\\tjava.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.awaitNanos(AbstractQueuedSynchronizer.java:2101)|\\tjava.util.concurrent.LinkedBlockingQueue.poll(LinkedBlockingQueue.java:467)|\\tjava.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1091)|\\tjava.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1152)|\\tjava.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:641)|\\tjava.lang.Thread.run(Thread.java:764)|\\t|Thread Name: pool-1-thread-1|java.lang.Object.wait(Native Method)|\\tjava.lang.Thread.parkFor$(Thread.java:2137)|\\tsun.misc.Unsafe.park(Unsafe.java:358)|\\tjava.util.concurrent.locks.LockSupport.park(LockSupport.java:190)|\\tjava.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.await(AbstractQueuedSynchronizer.java:2059)|\\tjava.util.concurrent.ScheduledThreadPoolExecutor$DelayedWorkQueue.take(ScheduledThreadPoolExecutor.java:1120)|\\tjava.util.concurrent.ScheduledThreadPoolExecutor$DelayedWorkQueue.take(ScheduledThreadPoolExecutor.java:849)|\\tjava.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1092)|\\tjava.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1152)|\\tjava.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:641)|\\tjava.lang.Thread.run(Thread.java:764)|\\t|Thread Name: pool-3-thread-1|java.lang.Object.wait(Native Method)|\\tjava.lang.Thread.parkFor$(Thread.java:2137)|\\tsun.misc.Unsafe.park(Unsafe.java:358)|\\tjava.util.concurrent.locks.LockSupport.park(LockSupport.java:190)|\\tjava.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.await(AbstractQueuedSynchronizer.java:2059)|\\tjava.util.concurrent.ScheduledThreadPoolExecutor$DelayedWorkQueue.take(ScheduledThreadPoolExecutor.java:1120)|\\tjava.util.concurrent.ScheduledThreadPoolExecutor$DelayedWorkQueue.take(ScheduledThreadPoolExecutor.java:849)|\\tjava.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1092)|\\tjava.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1152)|\\tjava.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:641)|\\tjava.lang.Thread.run(Thread.java:764)|\\t|Thread Name: queued-work-looper|android.os.MessageQueue.nativePollOnce(Native Method)|\\tandroid.os.MessageQueue.next(MessageQueue.java:326)|\\tandroid.os.Looper.loop(Looper.java:183)|\\tandroid.os.HandlerThread.run(HandlerThread.java:65)|\\t||Thread Name: main||==========Logcat|11-22 07:17:36.735 W/System.err(31451): java.lang.InternalError: Thread starting during runtime shutdown|11-22 07:17:36.735 W/System.err(31451): \\tat java.lang.Thread.nativeCreate(Native Method)|11-22 07:17:36.736 W/System.err(31451): \\tat java.lang.Thread.start(Thread.java:733)|11-22 07:17:36.736 W/System.err(31451): \\tat java.util.concurrent.ThreadPoolExecutor.addWorker(ThreadPoolExecutor.java:975)|11-22 07:17:36.736 W/System.err(31451): \\tat java.util.concurrent.ThreadPoolExecutor.execute(ThreadPoolExecutor.java:1393)|11-22 07:17:36.736 W/System.err(31451): \\tat java.lang.UNIXProcess.initStreams(UNIXProcess.java:170)|11-22 07:17:36.736 W/System.err(31451): \\tat java.lang.UNIXProcess$2.run(UNIXProcess.java:143)|11-22 07:17:36.736 W/System.err(31451): \\tat java.lang.UNIXProcess$2.run(UNIXProcess.java:141)|11-22 07:17:36.736 W/System.err(31451): \\tat java.security.AccessController.doPrivileged(AccessController.java:69)|11-22 07:17:36.736 W/System.err(31451): \\tat java.lang.UNIXProcess.<init>(UNIXProcess.java:141)|11-22 07:17:36.736 W/System.err(31451): \\tat java.lang.ProcessImpl.start(ProcessImpl.java:132)|11-22 07:17:36.736 W/System.err(31451): \\tat java.lang.ProcessBuilder.start(ProcessBuilder.java:1029)|11-22 07:17:36.736 W/System.err(31451): \\tat java.lang.Runtime.exec(Runtime.java:695)|11-22 07:17:36.736 W/System.err(31451): \\tat java.lang.Runtime.exec(Runtime.java:525)|11-22 07:17:36.736 W/System.err(31451): \\tat java.lang.Runtime.exec(Runtime.java:422)|11-22 07:17:36.736 W/System.err(31451): \\tat a3.c.a(Unknown Source:43)|11-22 07:17:36.736 W/System.err(31451): \\tat kr.co.miaps.mpas.MAXY$f.uncaughtException(Unknown Source:236)|11-22 07:17:36.736 W/System.err(31451): \\tat java.lang.ThreadGroup.uncaughtException(ThreadGroup.java:1068)|11-22 07:17:36.736 W/System.err(31451): \\tat java.lang.ThreadGroup.uncaughtException(ThreadGroup.java:1063)|11-22 07:17:36.736 W/System.err(31451): \\tat java.lang.Thread.dispatchUncaughtException(Thread.java:1955)|",
                  "timezone": "Asia/Seoul",
                  "webviewVer": "119.0.6045.163",
                  "appBuildNum": "165",
                  "referer": "",
                  "ip": "182.211.183.16",
                  "intervaltime": 0,
                  "regDt": null,
                  "logYear": "2023",
                  "logMonth": "11",
                  "logDate": "22",
                  "loginYn": "N",
                  "logStartTm": 0,
                  "logEndTm": 0,
                  "aliasValue": "none",
                  "geoip": null,
                  "vipYn": null,
                  "emailAddr": null,
                  "phoneNo": null,
                  "sex": null,
                  "userNm": null,
                  "userId": null,
                  "residence": null,
                  "cntryCd": null,
                  "birthDay": null,
                  "maxySessionId": "",
                  "webOnlyYn": "N"
                }""";

        List<Map<String, Object>> dummy = new ArrayList<>();
        dummy.add(JsonUtil.fromJson(dummyStr1, Map.class));
        dummy.add(JsonUtil.fromJson(dummyStr2, Map.class));
        dummy.add(JsonUtil.fromJson(dummyStr3, Map.class));
        dummy.add(JsonUtil.fromJson(dummyStr4, Map.class));
        dummy.add(JsonUtil.fromJson(dummyStr5, Map.class));
        dummy.add(JsonUtil.fromJson(dummyStr6, Map.class));
        dummy.add(JsonUtil.fromJson(dummyStr7, Map.class));
        dummy.add(JsonUtil.fromJson(dummyStr8, Map.class));
        dummy.add(JsonUtil.fromJson(dummyStr9, Map.class));
        dummy.add(JsonUtil.fromJson(dummyStr10, Map.class));
        dummy.add(JsonUtil.fromJson(dummyStr11, Map.class));

        return dummy;
    }
}
