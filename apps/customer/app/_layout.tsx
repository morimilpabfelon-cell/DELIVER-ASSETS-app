import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { AppProvider } from '@/context/AppContext'
import { AppErrorBoundary } from '@/components/AppErrorBoundary'
import { FeedbackProvider } from '@/components/FeedbackProvider'
import { C } from '@/theme'
export default function RootLayout(){return <GestureHandlerRootView style={{flex:1}}><AppErrorBoundary><FeedbackProvider><AppProvider><StatusBar style="dark"/><Stack screenOptions={{headerShown:false,contentStyle:{backgroundColor:C.paper},animation:'slide_from_right'}}><Stack.Screen name="index" options={{animation:'fade'}}/><Stack.Screen name="onboarding" options={{animation:'fade'}}/><Stack.Screen name="auth"/><Stack.Screen name="location"/><Stack.Screen name="(tabs)" options={{animation:'fade'}}/><Stack.Screen name="product/[id]" options={{presentation:'modal',animation:'slide_from_bottom'}}/><Stack.Screen name="cart"/><Stack.Screen name="tracking" options={{animation:'slide_from_bottom'}}/><Stack.Screen name="resilience-center"/></Stack></AppProvider></FeedbackProvider></AppErrorBoundary></GestureHandlerRootView>}
